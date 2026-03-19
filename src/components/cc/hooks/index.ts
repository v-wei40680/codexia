import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCCStore } from '@/stores/cc';
import type { CCMessage, SystemMessage } from '../types/messages';

const CC_LISTENER_READY_EVENT = 'cc-session-listener-ready';
const CC_PERMISSION_LISTENER_READY_EVENT = 'cc-permission-listener-ready';

interface CCListenerOptions {
  /** Disable the listener entirely. */
  disabled?: boolean;
  /**
   * When provided, operates in embedded mode: only messages matching this
   * sessionId are accepted and routed via addMessageToSession instead of
   * the global addMessage.
   */
  sessionId?: string;
}

/**
 * Hook to listen for message stream events from the Tauri backend.
 * Supports both standalone (global active session) and embedded (per-session) modes.
 */
export function useCCSessionListener({ disabled = false, sessionId }: CCListenerOptions = {}) {
  const { activeSessionId, addMessage, addMessageToSession, setSlashCommands } = useCCStore();

  // In embedded mode the target session is the explicit sessionId; otherwise the active one.
  const targetSessionId = sessionId ?? activeSessionId;

  useEffect(() => {
    if (disabled || !targetSessionId) return;
    console.info('[CCView] Bind message listener', { targetSessionId });

    const unlistenPromise = listen<CCMessage>('cc-message', (event) => {
      const message = event.payload;
      const msgSessionId = (message as { session_id?: string }).session_id;
      if (msgSessionId && msgSessionId !== targetSessionId) return;

      console.info('[CCView] Received message', event);

      if (sessionId) {
        // Embedded mode: route to per-session store slice.
        addMessageToSession(sessionId, message);
      } else {
        // Standalone mode: route to global store and capture slash commands.
        if (message.type === 'system' && (message as SystemMessage).subtype === 'init') {
          const cmds = (message as SystemMessage).slash_commands;
          if (Array.isArray(cmds)) setSlashCommands(cmds);
        }
        addMessage(message);
      }
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Message listener ready', { targetSessionId });
      if (!sessionId) {
        window.dispatchEvent(new CustomEvent(CC_LISTENER_READY_EVENT, { detail: { sessionId: targetSessionId } }));
      }
    });

    return () => {
      void unlistenPromise.then((fn) => fn());
    };
  }, [disabled, targetSessionId, sessionId, addMessage, addMessageToSession, setSlashCommands]);
}

/**
 * Hook to listen for permission requests from the Tauri backend.
 * Supports both standalone (global active session) and embedded (per-session) modes.
 */
export function useCCPermissionListener({ disabled = false, sessionId }: CCListenerOptions = {}) {
  const { activeSessionId, addMessage, addMessageToSession } = useCCStore();

  const targetSessionId = sessionId ?? activeSessionId;

  useEffect(() => {
    if (disabled || !targetSessionId) return;
    console.info('[CCView] Bind permission listener', { targetSessionId });

    const unlistenPromise = listen<{
      requestId: string;
      sessionId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
      alwaysAllowTarget?: 'project' | 'session';
    }>('cc-permission-request', (event) => {
      const { requestId, sessionId: evtSessionId, toolName, toolInput, alwaysAllowTarget } = event.payload;
      if (evtSessionId !== targetSessionId) {
        if (!sessionId) {
          console.warn('[CCView] Ignoring permission request for inactive session', {
            targetSessionId,
            requestId,
            evtSessionId,
          });
        }
        return;
      }

      const permissionMessage = {
        type: 'permission_request',
        requestId,
        sessionId: evtSessionId,
        toolName,
        alwaysAllowTarget,
        toolInput,
      } as CCMessage;

      if (sessionId) {
        addMessageToSession(sessionId, permissionMessage);
      } else {
        addMessage(permissionMessage);
      }
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Permission listener ready', { targetSessionId });
      if (!sessionId) {
        window.dispatchEvent(
          new CustomEvent(CC_PERMISSION_LISTENER_READY_EVENT, {
            detail: { sessionId: targetSessionId },
          }),
        );
      }
    });

    return () => {
      void unlistenPromise.then((fn) => fn());
    };
  }, [disabled, targetSessionId, sessionId, addMessage, addMessageToSession]);
}
