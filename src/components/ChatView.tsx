import React, { useState, useEffect, useMemo } from "react";
import { ChatInterface } from "./chat/ChatInterface";
import { ConversationTabs } from "@/components/chat/ConversationTabs";
import { useConversationStore } from "@/stores/ConversationStore";
import type { Conversation } from "@/types/chat";

interface ChatViewProps {
  selectedConversation?: Conversation | null;
  showChatTabs?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ selectedConversation, showChatTabs = false }) => {
  const {
    currentConversationId,
    conversations: activeConversations,
    deleteConversation,
    setCurrentConversation,
    selectHistoryConversation,
    pendingNewConversation,
    toggleFavorite,
  } = useConversationStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [internalSelectedConversation, setInternalSelectedConversation] = useState<Conversation | null>(null);

  // Generate favorite statuses from the persisted store data
  const favoriteStatuses = useMemo(() => {
    const statuses: Record<string, boolean> = {};
    activeConversations.forEach(conv => {
      statuses[conv.id] = conv.isFavorite || false;
    });
    return statuses;
  }, [activeConversations]);

  const handleConversationSelect = (conversation: Conversation) => {
    const conversationCopy = { ...conversation };
    setInternalSelectedConversation(conversationCopy);
    console.log("🔄 ChatView: Calling selectHistoryConversation", conversation.id);
    selectHistoryConversation(conversationCopy);
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentConversation(sessionId);
  };

  const handleDeleteConversation = async (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      deleteConversation(conversationId);
    } catch (error) {
      console.error("Failed to delete conversation and session file:", error);
    }
  };

  const handleToggleFavorite = async (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      // Use the store's toggleFavorite method directly for persistence
      toggleFavorite(conversationId);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  // Clear selected conversation when starting a new conversation
  useEffect(() => {
    if (pendingNewConversation) {
      setInternalSelectedConversation(null);
    }
  }, [pendingNewConversation]);

  // Also clear when currentConversationId changes to a new codex-event format (from toolbar button)
  useEffect(() => {
    if (currentConversationId && currentConversationId.startsWith('codex-event-')) {
      // Check if this is a new conversation (no messages)
      const currentConv = activeConversations.find(conv => conv.id === currentConversationId);
      if (currentConv && currentConv.messages.length === 0) {
        setInternalSelectedConversation(null);
      }
    }
  }, [currentConversationId, activeConversations]);

  // Use either the passed selectedConversation or internal one
  const displayedConversation = selectedConversation || internalSelectedConversation;

  if (showChatTabs) {
    return (
      <ConversationTabs
        favoriteStatuses={favoriteStatuses}
        activeConversations={activeConversations}
        currentConversationId={currentConversationId}
        activeSessionId={currentConversationId || ''}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectConversation={handleConversationSelect}
        onToggleFavorite={handleToggleFavorite}
        onDeleteConversation={handleDeleteConversation}
        onSelectSession={handleSelectSession}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 h-full min-w-0">
      <ChatInterface
        sessionId={currentConversationId || ''}
        selectedConversation={displayedConversation}
      />
    </div>
  );
};
