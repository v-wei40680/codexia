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
import { playBeep } from '@/utils/beep';
import { allowSleep, preventSleep } from '@/services/tauri';
import { buildWsUrl, isTauri } from '@/hooks/runtime';

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

export function useCodexEvents(enabled = true) {
  const { addEvent } = useCodexStore();
  const { addApproval } = useApprovalStore();
  const { addRequest } = useRequestUserInputStore();
  const taskCompleteBeepMode = useSettingsStore((state) => state.enableTaskCompleteBeep);
  const preventSleepDuringTasks = useSettingsStore((state) => state.preventSleepDuringTasks);
  const isChatInterfaceActive = useLayoutStore((state) => state.view === 'codex');

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleServerNotification = (payload: ServerNotification) => {
      if (
        ![
          'rawResponseItem/completed',
          'account/rateLimits/updated',
          'item/reasoning/textDelta',
          'item/agentMessage/delta',
          'thread/tokenUsage/updated',
          'item/reasoning/summaryTextDelta',
          'item/reasoning/summaryPartAdded',
        ].includes(payload.method)
      ) {
        console.log(`[useCodexEvents] ${payload.method}:`, payload.params);
      }

      let threadId: string | undefined;

      if ('params' in payload && payload.params) {
        const params = payload.params as any;
        if ('threadId' in params) {
          threadId = params.threadId;
        } else if ('thread' in params && params.thread?.id) {
          threadId = params.thread.id;
        }
      }

      if (threadId) {
        if (payload.method === 'thread/started' && 'params' in payload && payload.params) {
          const startedThread = (payload.params as any).thread;
          const startedThreadId = startedThread?.id;
          const startedThreadCwd = startedThread?.cwd;
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

          const turnStatus = (payload.params as any)?.turn?.status;
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
        if (payload.method !== 'account/rateLimits/updated') {
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
    enabled,
    taskCompleteBeepMode,
    preventSleepDuringTasks,
    isChatInterfaceActive,
  ]);
}
