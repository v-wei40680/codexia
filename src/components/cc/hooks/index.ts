import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCCStore } from '@/stores/cc';
import type { CCMessage, SystemMessage } from '../types/messages';

const CC_LISTENER_READY_EVENT = 'cc-session-listener-ready';
const CC_PERMISSION_LISTENER_READY_EVENT = 'cc-permission-listener-ready';

/**
 * Hook to listen for message stream events from the Tauri backend for the active session.
 */
export function useCCSessionListener() {
  const { activeSessionId, addMessage, setLoading, setSlashCommands } = useCCStore();

  useEffect(() => {
    if (!activeSessionId) return;
    console.info('[CCView] Bind message listener', { activeSessionId });

    const unlistenPromise = listen<CCMessage>('cc-message', (event) => {
      const message = event.payload;
      // Filter messages that belong to a different session.
      const msgSessionId = (message as { session_id?: string }).session_id;
      if (msgSessionId && msgSessionId !== activeSessionId) return;

      console.info('[CCView] Received message', event);
      // Capture slash commands from System::init
      if (message.type === 'system' && (message as SystemMessage).subtype === 'init') {
        const cmds = (message as SystemMessage).slash_commands;
        if (Array.isArray(cmds)) setSlashCommands(cmds);
      }
      addMessage(message);
      if (message.type === 'result') setLoading(false);
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Message listener ready', { activeSessionId });
      window.dispatchEvent(new CustomEvent(CC_LISTENER_READY_EVENT, { detail: { sessionId: activeSessionId } }));
    });

    return () => {
      void unlistenPromise.then((fn) => fn());
    };
  }, [activeSessionId, addMessage, setLoading]);
}

/**
 * Hook to listen for permission requests from the Tauri backend.
 */
export function useCCPermissionListener() {
  const { activeSessionId, addMessage } = useCCStore();

  useEffect(() => {
    if (!activeSessionId) return;
    console.info('[CCView] Bind permission listener', { activeSessionId });

    const unlistenPromise = listen<{
      requestId: string;
      sessionId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
      alwaysAllowTarget?: 'project' | 'session';
    }>('cc-permission-request', (event) => {
      const { requestId, sessionId, toolName, toolInput, alwaysAllowTarget } = event.payload;
      if (sessionId !== activeSessionId) {
        console.warn('[CCView] Ignoring permission request for inactive session', {
          activeSessionId,
          requestId,
          sessionId,
        });
        return;
      }
      addMessage({
        type: 'permission_request',
        requestId,
        sessionId,
        toolName,
        alwaysAllowTarget,
        toolInput,
      } as CCMessage);
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Permission listener ready', { activeSessionId });
      window.dispatchEvent(
        new CustomEvent(CC_PERMISSION_LISTENER_READY_EVENT, {
          detail: { sessionId: activeSessionId },
        }),
      );
    });

    return () => {
      void unlistenPromise.then((fn) => fn());
    };
  }, [activeSessionId, addMessage]);
}
