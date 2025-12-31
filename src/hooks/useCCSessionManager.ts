import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCCStore } from "@/stores/ccStore";
import { useCodexStore } from "@/stores/codex";

/**
 * Custom hook for managing Claude Code sessions
 * Handles session creation, resumption, and selection
 */
export function useCCSessionManager() {
  const { cwd } = useCodexStore();
  const {
    options,
    setActiveSessionId,
    setMessages,
    setConnected,
    setLoading,
    setShowExamples,
    addMessage,
  } = useCCStore();

  const [isLoading, setIsLoading] = useState(false);

  const handleNewSession = async (initialMessage?: string) => {
    try {
      setIsLoading(true);
      setLoading(true);
      const ClaudeAgentOptions: any = {
        cwd,
        model: `claude-${options.model}-4-5`,
        permissionMode: options.permissionMode,
      };

      // Only include optional fields if they are defined
      if (options.fallbackModel !== undefined) ClaudeAgentOptions.fallbackModel = options.fallbackModel;
      if (options.maxTurns !== undefined) ClaudeAgentOptions.maxTurns = options.maxTurns;
      if (options.maxBudgetUsd !== undefined) ClaudeAgentOptions.maxBudgetUsd = options.maxBudgetUsd;
      if (options.maxThinkingTokens !== undefined) ClaudeAgentOptions.maxThinkingTokens = options.maxThinkingTokens;
      if (options.allowedTools !== undefined) ClaudeAgentOptions.allowedTools = options.allowedTools;
      if (options.disallowedTools !== undefined) ClaudeAgentOptions.disallowedTools = options.disallowedTools;

      console.debug("ClaudeAgentOptions", ClaudeAgentOptions)
      const newSessionId = await invoke<string>("cc_new_session", {
        options: ClaudeAgentOptions,
      });

      setActiveSessionId(newSessionId);
      setMessages([]);
      setConnected(true);
      setShowExamples(false);

      // Send initial message if provided
      if (initialMessage) {
        addMessage({
          type: "user",
          text: initialMessage,
        });

        await invoke("cc_send_message", {
          sessionId: newSessionId,
          message: initialMessage,
        });
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Failed to create new session:", error);
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
      setActiveSessionId(sessionId);
      setShowExamples(false);

      const ClaudeAgentOptions: any = {
        cwd,
        model: `claude-${options.model}-4-5`,
        permissionMode: options.permissionMode,
      };

      // Only include optional fields if they are defined
      if (options.fallbackModel !== undefined) ClaudeAgentOptions.fallbackModel = options.fallbackModel;
      if (options.maxTurns !== undefined) ClaudeAgentOptions.maxTurns = options.maxTurns;
      if (options.maxBudgetUsd !== undefined) ClaudeAgentOptions.maxBudgetUsd = options.maxBudgetUsd;
      if (options.maxThinkingTokens !== undefined) ClaudeAgentOptions.maxThinkingTokens = options.maxThinkingTokens;
      if (options.allowedTools !== undefined) ClaudeAgentOptions.allowedTools = options.allowedTools;
      if (options.disallowedTools !== undefined) ClaudeAgentOptions.disallowedTools = options.disallowedTools;

      await invoke("cc_resume_session", {
        sessionId,
        options: ClaudeAgentOptions,
      });

      setConnected(true);
    } catch (error) {
      console.error("Failed to resume session:", error);
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
