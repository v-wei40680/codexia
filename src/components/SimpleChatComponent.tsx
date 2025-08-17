import React, { useState, useEffect, useMemo } from "react";
import { ChatInterface } from "./ChatInterface";
import { ChatTabs } from "./chat/ChatTabs";
import { useConversationStore } from "@/stores/ConversationStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { sessionManager } from "../services/sessionManager";
import { sessionLoader } from "@/services/sessionLoader";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Conversation } from "../types/chat";
import { invoke } from "@tauri-apps/api/core";

export const SimpleChatComponent: React.FC = () => {
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
      // First check if it's a UUID session we should ignore
      const isTimestampFormat = sessionId.startsWith('codex-event-') && sessionId.includes('-') && 
        /\d{13}-[a-z0-9]+$/.test(sessionId.replace('codex-event-', ''));
      
      if (!isTimestampFormat) {
        console.log(`💀 Ignoring UUID session kill: ${sessionId}`);
        return;
      }

      await sessionManager.stopSession(sessionId);
      console.log(`✅ Session stopped: ${sessionId}`);
    } catch (error) {
      console.error('Failed to kill session:', error);
    }
  };

  const filteredConversations = useMemo(() => {
    let allConversations: Conversation[] = [];

    if (conversationListTab === "favorites") {
      // Favorites tab shows only history conversations that are favorited
      allConversations = historyConversations.filter(
        (c) => favoriteStatuses[c.id],
      );
      console.log(`⭐ Favorites tab: ${allConversations.length} favorited history conversations`);
    } else if (conversationListTab === "sessions") {
      // Sessions tab shows active conversations from store (codex-event- sessions)
      allConversations = activeConversations.filter(conv => 
        conv.id.startsWith('codex-event-') && 
        /\d{13}-[a-z0-9]+$/.test(conv.id.replace('codex-event-', ''))
      );
      console.log(`📋 Sessions tab: ${allConversations.length} active sessions from store`);
    } else {
      // All tab shows ALL history conversations loaded from disk (no pending/temp conversations)
      allConversations = historyConversations;
      console.log(`📁 All tab: ${allConversations.length} history conversations from disk`);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const originalLength = allConversations.length;
      allConversations = allConversations.filter(
        (conversation) =>
          conversation.title.toLowerCase().includes(query) ||
          conversation.messages.some((msg) =>
            msg.content.toLowerCase().includes(query),
          ),
      );
      console.log(`🔍 Search filtered: ${originalLength} -> ${allConversations.length} conversations`);
    }

    console.log(`🎯 Final filtered conversations for ${conversationListTab} tab:`, allConversations.map(c => ({
      id: c.id.substring(0, 8),
      title: c.title,
      filePath: c.filePath
    })));

    return allConversations;
  }, [historyConversations, activeConversations, searchQuery, conversationListTab, favoriteStatuses]);

  return (
    <div className="flex h-full min-h-0">
      {showSessionList && (
        <div className="w-64 border-r h-full overflow-y-auto flex-shrink-0">
          <div className="flex flex-col h-full bg-gray-50">
            <div className="flex items-center justify-between p-3 border-b bg-white">
              <h3 className="text-sm font-medium text-gray-900">Conversations</h3>
            </div>
            
            {/* Debug Info */}
            <div className="p-2 bg-yellow-50 border-b text-xs text-gray-600">
              <div className="mb-1">
                <strong>Debug Info:</strong>
              </div>
              <div>Active Tab: <span className="font-mono">{conversationListTab}</span></div>
              <div>Current Session ID: <span className="font-mono">{currentConversationId || 'null'}</span></div>
              <div>History Conversations: {historyConversations.length}</div>
              <div>Active Conversations: {activeConversations.length}</div>
              <div>Filtered Conversations: {filteredConversations.length}</div>
            </div>

            <div className="p-3 bg-white border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
            <ChatTabs
              filteredConversations={filteredConversations}
              searchQuery={searchQuery}
              historyConversations={historyConversations}
              favoriteStatuses={favoriteStatuses}
              currentConversationId={currentConversationId}
              activeSessionId={currentConversationId || ''}
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
