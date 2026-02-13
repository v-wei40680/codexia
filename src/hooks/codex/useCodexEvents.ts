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
    // Listen for all codex:// events
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for approval requests
    unlistenPromises.push(
      listen<ApprovalRequest>('codex/approval-request', (event) => {
        addApproval(event.payload);
      })
    );

    // Listen for request_user_input prompts
    unlistenPromises.push(
      listen<RequestUserInputRequest>('codex/request-user-input', (event) => {
        addRequest(event.payload);
      })
    );

    // Add a catch-all listener to see ALL codex events
    console.log('[useCodexEvents] Setting up event listeners...');

    unlistenPromises.push(
      listen<ServerNotification>('codex:notification', (event) => {
        if (
          ![
            'rawResponseItem/completed',
            'account/rateLimits/updated',
            'item/reasoning/textDelta',
            'item/agentMessage/delta',
            'thread/tokenUsage/updated',
            'item/reasoning/summaryTextDelta',
            'item/reasoning/summaryPartAdded',
          ].includes(event.payload.method)
        ) {
          console.log(`[useCodexEvents] ${event.payload.method}:`, event.payload.params);
        }

        // Extract threadId from notification params
        const payload = event.payload;
        let threadId: string | undefined;

        if ('params' in payload && payload.params) {
          const params = payload.params as any;
          // Most notifications have threadId directly
          if ('threadId' in params) {
            threadId = params.threadId;
          }
          // ThreadStartedNotification has thread.id
          else if ('thread' in params && params.thread?.id) {
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
      })
    );

    // Cleanup
    return () => {
      Promise.all(unlistenPromises).then((unlisteners) => {
        unlisteners.forEach((unlisten) => unlisten());
      });
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
