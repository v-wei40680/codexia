import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ApprovalRequest } from "@/types/codex";
import type { Conversation } from "@/types/chat";
import { useConversationStore } from "@/stores/ConversationStore";
import { useCodexStore } from "@/stores/CodexStore";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useModelStore } from "@/stores/ModelStore";
import { sessionManager } from "@/services/sessionManager";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import { ApprovalDialog } from "../dialogs/ApprovalDialog";
import { useCodexEvents } from "../../hooks/useCodexEvents";
import { ReasoningEffortSelector } from './ReasoningEffortSelector';
import { Sandbox } from "./Sandbox";

interface ChatInterfaceProps {
  sessionId: string;
  selectedConversation?: Conversation | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sessionId,
  selectedConversation = null,
}) => {
  const { inputValue, setInputValue } = useChatInputStore();
  const { currentModel, currentProvider, reasoningEffort } = useModelStore();
  const [pendingApproval, setPendingApproval] =
    useState<ApprovalRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [tempSessionId, setTempSessionId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessionId);
  const [sessionStarting, setSessionStarting] = useState(false);

  const { config, updateConfig } = useCodexStore();
  const {
    getCurrentProjectConversations,
    currentConversationId,
    addMessage,
    setSessionLoading,
    createConversation,
    pendingNewConversation,
    setPendingNewConversation,
    setCurrentConversation,
  } = useConversationStore();
  
  // Get conversations filtered by current project
  const conversations = getCurrentProjectConversations();
  
  const setSandboxMode = (mode: typeof config.sandboxMode) => {
    updateConfig({ sandboxMode: mode });
  };

  // Simplified: Use session_id to find conversation data
  // Priority: selectedConversation (from disk/history) > conversations (from store)
  const currentConversation =
    selectedConversation ||
    conversations.find((conv) => conv.id === currentConversationId) ||
    conversations.find((conv) => conv.id === sessionId);

  // Convert conversation messages to chat messages format
  const sessionMessages = currentConversation
    ? currentConversation.messages.map((msg, index) => {
        return {
          id: msg.id || `${currentConversation.id}-msg-${index}`,
          type: (msg.role === "user"
            ? "user"
            : msg.role === "assistant"
              ? "agent"
              : "system") as "user" | "agent" | "system",
          content: msg.content,
          timestamp: new Date(
            typeof msg.timestamp === "number" ? msg.timestamp : Date.now(),
          ),
          model: msg.role === "assistant" ? currentModel : undefined,
        };
      })
    : [];

  useCodexEvents({
    sessionId: activeSessionId,
    onApprovalRequest: setPendingApproval,
  });

  const messages = [...sessionMessages];
  const isLoading = currentConversation?.isLoading || false;

  // Update activeSessionId when sessionId prop changes
  useEffect(() => {
    if (
      sessionId &&
      sessionId !== activeSessionId &&
      !tempSessionId &&
      sessionId.startsWith("codex-event-")
    ) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, activeSessionId, tempSessionId]);

  useEffect(() => {
    if (sessionId) {
      const isRunning = sessionManager.isSessionRunning(sessionId);
      setIsConnected(isRunning);

      // NEVER auto-start session for historical conversations
      // Only auto-start if:
      // 1. Not viewing history (selectedConversation is null)
      // 2. No messages exist (truly new conversation)
      // 3. Not pending new conversation
      // 4. Session is not already starting
      // 5. Session ID looks like current timestamp format (not old UUID format)
      const isTimestampFormat =
        sessionId.startsWith("codex-event-") &&
        /\d{13}-[a-z0-9]+$/.test(sessionId.replace("codex-event-", ""));

      if (
        !isRunning &&
        !sessionStarting &&
        messages.length === 0 &&
        !selectedConversation &&
        !pendingNewConversation &&
        isTimestampFormat &&
        sessionId.trim()
      ) {
        // Additional check: Only auto-start if this session was created very recently (within last 5 seconds)
        const timestampMatch = sessionId.match(/codex-event-(\d{13})-/);
        if (timestampMatch) {
          const sessionTimestamp = parseInt(timestampMatch[1]);
          const now = Date.now();
          const isRecentSession = now - sessionTimestamp < 5000; // 5 seconds

          if (isRecentSession) {
            const startSession = async () => {
              try {
                setSessionLoading(sessionId, true);
                // Create updated config with current model selection
                const updatedConfig = {
                  ...config,
                  model: currentModel,
                  provider: currentProvider,
                  useOss: currentProvider.toLowerCase() === "ollama",
                  reasoningEffort,
                };
                await sessionManager.ensureSessionRunning(
                  sessionId,
                  updatedConfig,
                );
                setIsConnected(true);
                setSessionLoading(sessionId, false);
              } catch (error) {
                console.error("Failed to auto-start session:", error);
                const errorMessage = {
                  id: `${sessionId}-auto-start-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                  role: "system" as const,
                  content: `Failed to start Codex session: ${error}`,
                  timestamp: Date.now(),
                };
                addMessage(sessionId, errorMessage);
                setSessionLoading(sessionId, false);
              }
            };

            startSession();
          } else {
          }
        }
      } else {
      }
    }
  }, [
    sessionId,
    selectedConversation,
    pendingNewConversation,
    sessionStarting,
  ]);

  const handleSendMessage = async (message: string) => {
    console.log("isConnected", isConnected);

    // NEW: Simple text message - view_image tool will handle any image paths
    const messageContent = message;

    if (!messageContent.trim() || isLoading) {
      return;
    }

    // Prevent sending messages when viewing historical conversations
    if (selectedConversation) {
      return;
    }

    let actualSessionId = sessionId;

    // Handle pending new conversation, temporary sessionId, or empty sessionId
    let isPendingSession = false;
    if (pendingNewConversation || !sessionId.trim()) {
      // Check if there's already a conversation waiting to be used
      const existingNewConversation = conversations.find(
        (conv) =>
          conv.id.startsWith("codex-event-") &&
          conv.messages.length === 0 &&
          /\d{13}-[a-z0-9]+$/.test(conv.id.replace("codex-event-", "")),
      );

      if (existingNewConversation) {
        // Use the existing empty conversation
        actualSessionId = existingNewConversation.id;
        setCurrentConversation(actualSessionId);
        setActiveSessionId(actualSessionId);
        setPendingNewConversation(false);
      } else {
        // Close any previous sessions before creating a new one
        const runningSessions = sessionManager.getLocalRunningSessions();
        if (runningSessions.length > 0) {
          console.log(
            `Closing ${runningSessions.length} existing sessions before creating new one`,
          );
          await sessionManager.closeAllSessions();
        }

        actualSessionId = `codex-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setTempSessionId(actualSessionId);
        setPendingNewConversation(false);
        isPendingSession = true;
      }
    } else {
      // If no conversation exists, create a new session with timestamp format
      const conversationExists = conversations.find(
        (conv) => conv.id === sessionId,
      );
      if (!conversationExists) {
        // Always use timestamp format for consistency
        actualSessionId = `codex-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        createConversation("New Chat", "agent", actualSessionId);
      }
    }

    // Ensure session is running before sending message
    try {
      if (!sessionManager.isSessionRunning(actualSessionId)) {
        setSessionStarting(true);
        setSessionLoading(actualSessionId, true);
        // Create updated config with current model selection
        const updatedConfig = {
          ...config,
          model: currentModel,
          provider: currentProvider,
          useOss: currentProvider.toLowerCase() === "ollama",
          reasoningEffort,
        };
        await sessionManager.ensureSessionRunning(
          actualSessionId,
          updatedConfig,
        );
        setIsConnected(true);

        if (isPendingSession) {
          createConversation("New Chat", "agent", actualSessionId);
          setCurrentConversation(actualSessionId);
          setActiveSessionId(actualSessionId);
          setTempSessionId(null);
        }

        setSessionLoading(actualSessionId, false);
        setSessionStarting(false);
      }
    } catch (error) {
      console.error("Failed to start session:", error);
      setSessionStarting(false);
      const errorMessage = {
        id: `${actualSessionId}-startup-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        role: "system" as const,
        content: `Failed to start Codex session: ${error}`,
        timestamp: Date.now(),
      };
      addMessage(actualSessionId, errorMessage);
      setSessionLoading(actualSessionId, false);
      return;
    }

    // Add user message to conversation store
    const userMessage = {
      id: `${actualSessionId}-user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      role: "user" as const,
      content: messageContent,
      timestamp: Date.now(),
    };
    addMessage(actualSessionId, userMessage);
    setSessionLoading(actualSessionId, true);

    try {
      // Extract raw session ID for backend communication
      const rawSessionId = actualSessionId.startsWith("codex-event-")
        ? actualSessionId.replace("codex-event-", "")
        : actualSessionId;

      // NEW: Always send as regular text message - view_image tool handles images
      await invoke("send_message", {
        sessionId: rawSessionId,
        message: messageContent,
      });
      console.log("📤 ChatInterface: Sending text message:", messageContent);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: `${actualSessionId}-send-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        role: "system" as const,
        content: `Failed to send message: ${error}`,
        timestamp: Date.now(),
      };
      addMessage(actualSessionId, errorMessage);
      setSessionLoading(actualSessionId, false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!pendingApproval) return;

    try {
      // Extract raw session ID for backend communication
      const rawSessionId = sessionId.startsWith("codex-event-")
        ? sessionId.replace("codex-event-", "")
        : sessionId;

      if (pendingApproval.type === 'apply_patch') {
        // For apply_patch, use event.id (stored in pendingApproval.id)
        await invoke("approve_patch", {
          sessionId: rawSessionId,
          approvalId: pendingApproval.id,
          approved,
        });
      } else {
        // For exec, use call_id (stored in pendingApproval.id)  
        await invoke("approve_execution", {
          sessionId: rawSessionId,
          approvalId: pendingApproval.id,
          approved,
        });
      }
      setPendingApproval(null);
    } catch (error) {
      console.error("Failed to send approval:", error);
    }
  };

  const handleStopStreaming = async () => {
    try {
      // Extract raw session ID for backend communication
      const rawSessionId = sessionId.startsWith("codex-event-")
        ? sessionId.replace("codex-event-", "")
        : sessionId;

      await invoke("pause_session", {
        sessionId: rawSessionId,
      });

      // Immediately set loading to false after successful pause
      setSessionLoading(sessionId, false);
    } catch (error) {
      console.error("Failed to pause streaming:", error);
      // On error, also set loading to false
      setSessionLoading(sessionId, false);
    }
  };

  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isPendingNewConversation={pendingNewConversation || !sessionId.trim()}
        />

        <ApprovalDialog
          pendingApproval={pendingApproval}
          onApproval={handleApproval}
        />

        <ChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          disabled={!!selectedConversation}
          isLoading={isLoading}
        />
        
        <div className="flex px-2 pt-0.5">
          <Sandbox 
            sandboxMode={config.sandboxMode}
            onModeChange={setSandboxMode}
          />
          <ReasoningEffortSelector />
        </div>
      </div>
    </div>
  );
};
