import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  useCodexStore,
  useApprovalStore,
  useRequestUserInputStore,
  type ApprovalRequest,
  type RequestUserInputRequest,
} from '@/stores/codex';
import { useLayoutStore, useSettingsStore } from '@/stores/settings';
import type { ServerNotification } from '@/bindings/ServerNotification';
import type { AccountLoginCompletedNotification } from '@/bindings/v2';
import { playBeep } from '@/utils/beep';
import { allowSleep, preventSleep } from '@/services/tauri';
import { getAccountWithParams } from '@/services';
import { buildWsUrl, isTauri } from '@/hooks/runtime';
import { CodexParseErrorEvent, CodexStderrEvent } from '@/components/codex/CodexInternalEvent';

function shouldPlayCompletionBeep(
  mode: 'never' | 'unfocused' | 'always',
  isChatInterfaceActive: boolean
) {
  if (mode === 'never') {
    return false;
  }
  if (mode === 'always') {
    return true;
  }
  return document.hidden || !document.hasFocus() || !isChatInterfaceActive;
}

const extractThreadId = (payload: ServerNotification): string | undefined => {
  if ('threadId' in payload.params && typeof payload.params.threadId === 'string') {
    return payload.params.threadId;
  }
  if ('thread' in payload.params) {
    const threadCandidate = payload.params.thread as { id?: unknown } | null | undefined;
    if (threadCandidate && typeof threadCandidate.id === 'string') {
      return threadCandidate.id;
    }
  }
  return undefined;
};

export function useCodexEvents(enabled = true) {
  const { addEvent, setHasAccount } = useCodexStore();
  const { addApproval } = useApprovalStore();
  const { addRequest } = useRequestUserInputStore();
  const { preventSleepDuringTasks, showReasoning } = useSettingsStore();
  const taskCompleteBeepMode = useSettingsStore((state) => state.enableTaskCompleteBeep);
  const isChatInterfaceActive = useLayoutStore((state) => state.view === 'codex');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const syncAccountState = async (refreshToken: boolean) => {
      try {
        const response = await getAccountWithParams({ refreshToken });
        setHasAccount(Boolean(response.account));
      } catch (error) {
        console.error('[useCodexEvents] Failed to sync account state:', error);
        setHasAccount(false);
      }
    };

    void syncAccountState(false);

    const handleServerNotification = (payload: ServerNotification) => {
      if (payload.method === 'account/updated') {
        void syncAccountState(true);
      }

      if (payload.method === 'account/login/completed') {
        const loginCompleted = payload.params as AccountLoginCompletedNotification;
        if (loginCompleted.success) {
          void syncAccountState(true);
        }
      }

      if (
        ![
          'rawResponseItem/completed',
          'account/rateLimits/updated',
          'item/reasoning/textDelta',
          'item/agentMessage/delta',
          'item/plan/delta',
          'item/fileChange/outputDelta',
          'item/commandExecution/outputDelta',
          'item/commandExecution/terminalInteraction',
          'thread/tokenUsage/updated',
          'item/reasoning/summaryTextDelta',
          'item/reasoning/summaryPartAdded',
        ].includes(payload.method)
      ) {
        console.log(`[useCodexEvents] ${payload.method}:`, payload.params);
      }

      const threadId = extractThreadId(payload);

      if (threadId) {
        const isReasoningEvent =
          payload.method === 'item/reasoning/textDelta' ||
          payload.method === 'item/reasoning/summaryTextDelta' ||
          payload.method === 'item/reasoning/summaryPartAdded' ||
          (payload.method === 'item/completed' && payload.params.item.type === 'reasoning');
        if (!showReasoning && isReasoningEvent) {
          return;
        }

        if (payload.method === 'thread/started') {
          const startedThread = payload.params.thread;
          const startedThreadId = startedThread.id;
          const startedThreadCwd = startedThread.cwd;
          if (startedThreadId && startedThreadCwd) {
            useCodexStore.setState((state) => ({
              threads: state.threads.map((thread) =>
                thread.id === startedThreadId ? { ...thread, cwd: startedThreadCwd } : thread
              ),
            }));
          }
        }

        if (preventSleepDuringTasks && payload.method === 'turn/started') {
          void preventSleep(threadId).catch((error) => {
            console.warn('[useCodexEvents] preventSleep failed:', error);
          });
        }

        if (payload.method === 'turn/completed') {
          void allowSleep(threadId).catch((error) => {
            console.warn('[useCodexEvents] allowSleep failed:', error);
          });

          const turnStatus = payload.params.turn.status;
          if (
            turnStatus === 'completed' &&
            shouldPlayCompletionBeep(taskCompleteBeepMode, isChatInterfaceActive)
          ) {
            playBeep();
          }
        }

        if (payload.method === 'error') {
          void allowSleep(threadId).catch((error) => {
            console.warn('[useCodexEvents] allowSleep failed:', error);
          });
        }

        addEvent(threadId, payload);
      } else {
        if (
          payload.method !== 'account/rateLimits/updated' &&
          payload.method !== 'account/updated' &&
          payload.method !== 'error' &&
          payload.method !== 'account/login/completed'
        ) {
          console.warn('[useCodexEvents] No threadId found in payload:', payload);
        }
      }
    };

    if (isTauri()) {
      const unlistenPromises: Promise<() => void>[] = [];
      console.log('[useCodexEvents] Setting up Tauri event listeners...');

      unlistenPromises.push(
        listen<ApprovalRequest>('codex/approval-request', (event) => {
          addApproval(event.payload);
        })
      );

      unlistenPromises.push(
        listen<RequestUserInputRequest>('codex/request-user-input', (event) => {
          addRequest(event.payload);
        })
      );

      unlistenPromises.push(
        listen<ServerNotification>('codex:notification', (event) => {
          handleServerNotification(event.payload);
        })
      );

      unlistenPromises.push(
        listen<CodexStderrEvent>('codex:stderr', (event) => {
          console.error('[useCodexEvents] codex stderr:', event.payload.message);
        })
      );

      unlistenPromises.push(
        listen<CodexParseErrorEvent>('codex:parseError', (event) => {
          console.error('[useCodexEvents] codex parseError:', event.payload.error, event.payload.raw);
        })
      );

      return () => {
        Promise.all(unlistenPromises).then((unlisteners) => {
          unlisteners.forEach((unlisten) => unlisten());
        });
      };
    }

    console.log('[useCodexEvents] Setting up WebSocket event bridge...');
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closedByCleanup = false;

    const connectWebSocket = () => {
      ws = new WebSocket(buildWsUrl('/ws'));

      ws.onmessage = (messageEvent) => {
        try {
          const envelope = JSON.parse(messageEvent.data as string) as {
            event?: string;
            payload?: unknown;
          };

          if (!envelope.event) {
            return;
          }

          if (envelope.event === 'fs_change') {
            window.dispatchEvent(
              new CustomEvent('fs_change', {
                detail: envelope.payload,
              })
            );
            return;
          }
          if (envelope.event === 'thread/list-updated') {
            window.dispatchEvent(
              new CustomEvent('thread/list-updated', {
                detail: envelope.payload,
              })
            );
            return;
          }
          if (envelope.event === 'session/list-updated') {
            window.dispatchEvent(
              new CustomEvent('session/list-updated', {
                detail: envelope.payload,
              })
            );
            return;
          }

          if (envelope.event === 'codex/approval-request') {
            addApproval(envelope.payload as ApprovalRequest);
            return;
          }

          if (envelope.event === 'codex/request-user-input') {
            addRequest(envelope.payload as RequestUserInputRequest);
            return;
          }

          if (envelope.event === 'codex:notification') {
            handleServerNotification(envelope.payload as ServerNotification);
          }
        } catch (error) {
          console.warn('[useCodexEvents] Failed to parse websocket message:', error);
        }
      };

      ws.onclose = () => {
        if (closedByCleanup) {
          return;
        }
        reconnectTimer = setTimeout(connectWebSocket, 1000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWebSocket();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      ws?.close();
    };
  }, [
    addEvent,
    addApproval,
    addRequest,
    setHasAccount,
    enabled,
    taskCompleteBeepMode,
    preventSleepDuringTasks,
    showReasoning,
    isChatInterfaceActive,
  ]);
}
