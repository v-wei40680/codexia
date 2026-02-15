import { useState } from 'react';
import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ccNewSession, ccResumeSession, ccSendMessage } from '@/services';

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
    setViewingHistory,
    addMessage,
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
        setViewingHistory(false);
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
        ClaudeAgentOptions.model = `claude-${options.model}-4-5`;
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
      setViewingHistory(false);

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

  const handleResumeSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      setLoading(true);
      setMessages([]);
      setShowExamples(false);

      // Set session ID FIRST to ensure event listener is set up
      setActiveSessionId(sessionId);

      // Wait a tick to ensure the event listener is registered
      await new Promise((resolve) => setTimeout(resolve, 0));

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

      await ccResumeSession(sessionId, ClaudeAgentOptions);

      // Session history loaded, but not connected yet
      // Connection will happen when user sends first message
      setConnected(false);
      setViewingHistory(true);
    } catch (error) {
      console.error('Failed to resume session:', error);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    await handleResumeSession(sessionId);
  };

  return {
    handleNewSession,
    handleResumeSession,
    handleSessionSelect,
    isLoading,
  };
}
