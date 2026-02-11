import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  useCodexStore,
  useApprovalStore,
  useRequestUserInputStore,
  type ApprovalRequest,
  type RequestUserInputRequest,
} from '@/stores/codex';
import type { ServerNotification } from '@/bindings/ServerNotification';

export function useCodexEvents(enabled = true) {
  const { addEvent } = useCodexStore();
  const { addApproval } = useApprovalStore();
  const { addRequest } = useRequestUserInputStore();

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
  }, [addEvent, addApproval, enabled]);
}
