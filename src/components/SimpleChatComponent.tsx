import React, { useState, useEffect } from "react";
import { ChatInterface } from "./ChatInterface";
import { ConversationList } from "./chat";
import { ConfigIndicator } from "./ConfigIndicator";
import { useConversationStore } from "@/stores/ConversationStore";
import { useLayoutStore } from "@/stores/layoutStore";
import type { Conversation } from "../types/chat";

interface SimpleChatComponentProps {
  sessionId: string;
  activeSessionId?: string;
  onOpenConfig: () => void;
  onToggleSessionManager?: () => void;
}

export const SimpleChatComponent: React.FC<SimpleChatComponentProps> = ({
  sessionId,
  activeSessionId,
  onOpenConfig,
  onToggleSessionManager,
}) => {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);

  const {
    config,
    currentConversationId,
    createConversationWithLatestSession,
    selectOrCreateExternalSession,
    deleteConversation,
    pendingNewConversation,
  } = useConversationStore();
  const { showSessionList } = useLayoutStore();

  // Handle creating new conversation with latest session
  const handleCreateNewConversation = async () => {
    try {
      await createConversationWithLatestSession();
    } catch (error) {
      console.error("Failed to create new conversation:", error);
    }
  };

  // Handle conversation selection from history
  const handleConversationSelect = (conversation: Conversation) => {
    console.log(
      "Selecting conversation in SimpleChatComponent:",
      conversation.id,
      conversation.title,
    );

    // Store the selected conversation data
    setSelectedConversation(conversation);

    // Switch to this conversation's session ID
    selectOrCreateExternalSession(conversation.id, conversation.title);
  };

  // Clear selected conversation when currentConversationId changes (unless it's the same conversation)
  useEffect(() => {
    if (
      selectedConversation &&
      currentConversationId !== selectedConversation.id
    ) {
      setSelectedConversation(null);
    }
  }, [currentConversationId, selectedConversation]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <ConfigIndicator
        onOpenConfig={onOpenConfig}
        onToggleSessionManager={onToggleSessionManager}
      />
      <div className="flex h-full min-h-0">
        {showSessionList && (
          <div className="w-64 border-r h-full overflow-y-auto flex-shrink-0">
            <ConversationList
              onSelectConversation={handleConversationSelect}
              activeSessionId={sessionId}
            />
          </div>
        )}
        <div className="flex-1 min-h-0 h-full min-w-0">
          <ChatInterface
            sessionId={sessionId}
            config={config}
            activeSessionId={activeSessionId}
            onCreateSession={handleCreateNewConversation}
            onSelectSession={selectOrCreateExternalSession}
            onCloseSession={deleteConversation}
            isSessionListVisible={false}
            selectedConversation={selectedConversation}
          />
        </div>
      </div>
    </div>
  );
};
