import { useState } from 'react';
import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ccNewSession, ccResumeSession, ccSendMessage } from '@/services';

const CC_LISTENER_READY_EVENT = 'cc-session-listener-ready';
const CC_PERMISSION_LISTENER_READY_EVENT = 'cc-permission-listener-ready';

function waitForSessionListenerReady(sessionId: string, timeoutMs = 400): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener(CC_LISTENER_READY_EVENT, handleReady as EventListener);
      clearTimeout(timer);
      resolve();
    };

    const handleReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId?: string }>;
      if (customEvent.detail?.sessionId === sessionId) {
        cleanup();
      }
    };

    const timer = setTimeout(cleanup, timeoutMs);
    window.addEventListener(CC_LISTENER_READY_EVENT, handleReady as EventListener);
  });
}

function waitForPermissionListenerReady(sessionId: string, timeoutMs = 400): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      window.removeEventListener(
        CC_PERMISSION_LISTENER_READY_EVENT,
        handleReady as EventListener
      );
      clearTimeout(timer);
      resolve();
    };

    const handleReady = (event: Event) => {
      const customEvent = event as CustomEvent<{ sessionId?: string }>;
      if (customEvent.detail?.sessionId === sessionId) {
        cleanup();
      }
    };

    const timer = setTimeout(cleanup, timeoutMs);
    window.addEventListener(
      CC_PERMISSION_LISTENER_READY_EVENT,
      handleReady as EventListener
    );
  });
}

/**
 * Custom hook for managing Claude Code sessions
 * Handles session creation, resumption, and selection
 */
export function useCCSessionManager() {
  const { cwd } = useWorkspaceStore();
  const {
    options,
    setActiveSessionId,
    setMessages,
    setConnected,
    setLoading,
    setShowExamples,
    addMessage,
    switchToSession,
  } = useCCStore();

  const [isLoading, setIsLoading] = useState(false);

  const handleNewSession = async (initialMessage?: string) => {
    try {
      setIsLoading(true);
      setLoading(true);

      // If no initial message, just reset UI without creating backend session
      // Session will be created when user sends first message
      if (!initialMessage) {
        setActiveSessionId(null);
        setMessages([]);
        setConnected(false);
        setShowExamples(false);
        setLoading(false);
        setIsLoading(false);
        return;
      }

      // Create session with current options when sending first message
      const ClaudeAgentOptions: any = {
        cwd,
        permissionMode: options.permissionMode,
      };

      // Only include model if specified (otherwise use CLI default)
      if (options.model) {
        ClaudeAgentOptions.model = `${options.model}`;
      }

      // Only include optional fields if they are defined
      if (options.fallbackModel !== undefined)
        ClaudeAgentOptions.fallbackModel = options.fallbackModel;
      if (options.maxTurns !== undefined) ClaudeAgentOptions.maxTurns = options.maxTurns;
      if (options.maxBudgetUsd !== undefined)
        ClaudeAgentOptions.maxBudgetUsd = options.maxBudgetUsd;
      if (options.maxThinkingTokens !== undefined)
        ClaudeAgentOptions.maxThinkingTokens = options.maxThinkingTokens;
      if (options.allowedTools !== undefined)
        ClaudeAgentOptions.allowedTools = options.allowedTools;
      if (options.disallowedTools !== undefined)
        ClaudeAgentOptions.disallowedTools = options.disallowedTools;

      console.debug('ClaudeAgentOptions', ClaudeAgentOptions);
      const newSessionId = await ccNewSession(ClaudeAgentOptions);

      setActiveSessionId(newSessionId);
      setMessages([]);
      setShowExamples(false);
      console.info('[useCCSessionManager] New session created', {
        newSessionId,
        permissionMode: options.permissionMode,
      });

      // Wait for CC view listeners to bind before first message, otherwise
      // early permission requests can be missed by the UI.
      await new Promise((resolve) => setTimeout(resolve, 0));
      console.info('[useCCSessionManager] Waiting for listeners (new session)', {
        newSessionId,
      });
      await waitForSessionListenerReady(newSessionId);
      await waitForPermissionListenerReady(newSessionId);
      console.info('[useCCSessionManager] Listeners ready (new session)', {
        newSessionId,
      });

      // Connection will happen automatically when sending the first message
      addMessage({
        type: 'user',
        text: initialMessage,
      });

      await ccSendMessage(newSessionId, initialMessage);

      // Mark as connected after successfully sending message
      setConnected(true);
    } catch (error) {
      console.error('Failed to create new session:', error);
      setLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSession = async (sessionId: string, projectPath?: string) => {
    try {
      const effectiveCwd = projectPath ?? useWorkspaceStore.getState().cwd ?? cwd;
      console.info('[useCCSessionManager] Resume session start', { sessionId, cwd: effectiveCwd });
      setIsLoading(true);
      setLoading(true);
      setMessages([]);
      setShowExamples(false);

      // Set session ID FIRST to ensure event listener is set up
      setActiveSessionId(sessionId);

      // Wait for CC view listener readiness before replaying historical messages.
      await new Promise((resolve) => setTimeout(resolve, 0));
      console.info('[useCCSessionManager] Waiting for listeners (resume)', { sessionId });
      await waitForSessionListenerReady(sessionId);
      await waitForPermissionListenerReady(sessionId);
      console.info('[useCCSessionManager] Listeners ready (resume)', { sessionId });

      const ClaudeAgentOptions: any = {
        cwd: effectiveCwd,
        permissionMode: options.permissionMode,
      };

      // Only include model if specified (otherwise use CLI default)
      if (options.model) {
        ClaudeAgentOptions.model = `${options.model}`;
      }

      // Only include optional fields if they are defined
      if (options.fallbackModel !== undefined)
        ClaudeAgentOptions.fallbackModel = options.fallbackModel;
      if (options.maxTurns !== undefined) ClaudeAgentOptions.maxTurns = options.maxTurns;
      if (options.maxBudgetUsd !== undefined)
        ClaudeAgentOptions.maxBudgetUsd = options.maxBudgetUsd;
      if (options.maxThinkingTokens !== undefined)
        ClaudeAgentOptions.maxThinkingTokens = options.maxThinkingTokens;
      if (options.allowedTools !== undefined)
        ClaudeAgentOptions.allowedTools = options.allowedTools;
      if (options.disallowedTools !== undefined)
        ClaudeAgentOptions.disallowedTools = options.disallowedTools;

      await ccResumeSession(sessionId, ClaudeAgentOptions);
      console.info('[useCCSessionManager] Resume session success', { sessionId, cwd: effectiveCwd });

      // Session history loaded, but not connected yet
      // Connection will happen when user sends first message
      setConnected(false);
    } catch (error) {
      console.error('[useCCSessionManager] Failed to resume session', { sessionId, cwd: projectPath ?? cwd, error });
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleSessionSelect = async (sessionId: string, projectPath?: string) => {
    console.info('[useCCSessionManager] Session selected', { sessionId, cwd: projectPath ?? cwd });

    // If session is already active (in activeSessionIds), just switch to it — no backend resume needed
    const currentActiveSessionIds = useCCStore.getState().activeSessionIds;
    if (currentActiveSessionIds.includes(sessionId)) {
      console.info('[useCCSessionManager] Session already active, switching without resume', { sessionId });
      switchToSession(sessionId);
      return;
    }

    await handleResumeSession(sessionId, projectPath);
  };

  return {
    handleNewSession,
    handleResumeSession,
    handleSessionSelect,
    isLoading,
  };
}
