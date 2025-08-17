import React, { useState, useEffect } from "react";
import { ChatInterface } from "./ChatInterface";
import { ChatTabs } from "./chat/ChatTabs";
import { useConversationStore } from "@/stores/ConversationStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { sessionManager } from "../services/sessionManager";
import { sessionLoader } from "@/services/sessionLoader";
import type { Conversation } from "../types/chat";
import { invoke } from "@tauri-apps/api/core";
import { DebugInfo } from "./DebugInfo";

export const ChatComponent: React.FC = () => {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [searchQueries, setSearchQueries] = useState({
    all: "",
    favorites: "",
    sessions: ""
  });
  const [historyConversations, setHistoryConversations] = useState<
    Conversation[]
  >([]);
  const [favoriteStatuses, setFavoriteStatuses] = useState<
    Record<string, boolean>
  >({});

  const {
    config,
    currentConversationId,
    conversations: activeConversations,
    createConversationWithLatestSession,
    selectHistoryConversation,
    deleteConversation,
    setCurrentConversation,
  } = useConversationStore();
  const { showSessionList, conversationListTab, setConversationListTab } = useLayoutStore();

  useEffect(() => {
    if (currentConversationId && activeConversations.some(conv => conv.id === currentConversationId)) {
      setConversationListTab("sessions");
    }
  }, [currentConversationId, activeConversations, setConversationListTab]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await sessionLoader.loadSessionsFromDisk();
        setHistoryConversations(history);

        const statuses: Record<string, boolean> = {};
        for (const conv of history) {
          statuses[conv.id] = await sessionLoader.isConversationFavorited(
            conv.id,
          );
        }
        setFavoriteStatuses(statuses);
      } catch (error) {
        console.error("Failed to load history conversations:", error);
      }
    };

    loadHistory();
  }, []);

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
    // Store the selected conversation data
    setSelectedConversation(conversation);

    // Use the new method to select history conversation with full data
    console.log("🔄 SimpleChatComponent: Calling selectHistoryConversation");
    selectHistoryConversation(conversation);
  };

  const handleSelectSession = (sessionId: string) => {
    // Set the current session ID for communication
    setCurrentConversation(sessionId);
  };

  const handleDeleteConversation = async (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    try {
      const conversation = historyConversations.find(
        (c) => c.id === conversationId,
      );
      if (conversation && conversation.filePath) {
        await invoke("delete_session_file", {
          filePath: conversation.filePath,
        });
      }
      deleteConversation(conversationId);
      setHistoryConversations((prev) =>
        prev.filter((c) => c.id !== conversationId),
      );
      setFavoriteStatuses((prev) => {
        const newStatus = { ...prev };
        delete newStatus[conversationId];
        return newStatus;
      });
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
      await sessionLoader.toggleFavorite(conversationId);

      // Update local favorite status
      setFavoriteStatuses((prev) => ({
        ...prev,
        [conversationId]: !prev[conversationId],
      }));
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleKillSession = async (sessionId: string) => {
    console.log(`💀 SimpleChatComponent: Killing session ${sessionId}`);
    try {
      // First check if it's a timestamp format session
      const isTimestampFormat = sessionId.startsWith('codex-event-') && sessionId.includes('-') && 
        /\d{13}-[a-z0-9]+$/.test(sessionId.replace('codex-event-', ''));
      
      if (!isTimestampFormat) {
        console.log(`💀 Ignoring UUID session kill: ${sessionId}`);
        return;
      }

      // Extract the raw session ID for backend process management
      const rawSessionId = sessionId.replace('codex-event-', '');
      console.log(`🔄 Extracting raw session ID: ${rawSessionId}`);

      await sessionManager.stopSession(rawSessionId);
      console.log(`✅ Session stopped: ${sessionId}`);
      
      // Remove the conversation from the store to update UI
      deleteConversation(sessionId);
    } catch (error) {
      console.warn('Failed to kill session (session may have already been cleaned up):', error);
      // Don't throw error - session might have been cleaned up by hot reload or other reasons
    }
  };


  return (
    <div className="flex h-full min-h-0">
      {showSessionList && (
        <div className="w-64 border-r h-full overflow-y-auto flex-shrink-0">
          <div className="flex flex-col h-full bg-gray-50">
            
            <DebugInfo
              conversationListTab={conversationListTab}
              currentConversationId={currentConversationId}
              historyConversationsCount={historyConversations.length}
              activeConversationsCount={activeConversations.length}
              searchQueries={searchQueries}
            />

            <ChatTabs
              historyConversations={historyConversations}
              favoriteStatuses={favoriteStatuses}
              activeConversations={activeConversations}
              currentConversationId={currentConversationId}
              activeSessionId={currentConversationId || ''}
              searchQueries={searchQueries}
              onSearchChange={setSearchQueries}
              onSelectConversation={handleConversationSelect}
              onToggleFavorite={handleToggleFavorite}
              onDeleteConversation={handleDeleteConversation}
              onSelectSession={handleSelectSession}
              onKillSession={handleKillSession}
            />
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0 h-full min-w-0">
        <ChatInterface
          sessionId={currentConversationId || ''}
          config={config}
          activeSessionId={currentConversationId || ''}
          onCreateSession={handleCreateNewConversation}
          onSelectSession={handleSelectSession}
          onCloseSession={deleteConversation}
          isSessionListVisible={false}
          selectedConversation={selectedConversation}
        />
      </div>
    </div>
  );
};
