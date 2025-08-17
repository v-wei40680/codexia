import {
  useConversationStore,
} from "@/stores/ConversationStore";
import { sessionLoader } from "@/services/sessionLoader";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ChatTabs } from "./ChatTabs";
import { useState, useMemo, useEffect } from "react";
import type { Conversation } from "@/types/chat";
import { invoke } from "@tauri-apps/api/core";

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  activeSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onKillSession?: (sessionId: string) => void;
}

export function ConversationList({
  onSelectConversation,
  activeSessionId,
  onSelectSession,
  onKillSession,
}: ConversationListProps) {
  const {
    currentConversationId,
    conversations: activeConversations,
    setCurrentConversation,
    deleteConversation,
  } = useConversationStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [historyConversations, setHistoryConversations] = useState<
    Conversation[]
  >([]);
  const [favoriteStatuses, setFavoriteStatuses] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (activeSessionId && activeConversations.some(conv => conv.id === activeSessionId)) {
      setActiveTab("sessions");
    }
  }, [activeSessionId, activeConversations]);
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

  const handleSelectConversation = (conversation: Conversation) => {
    console.log(`🔍 ConversationList: Selecting conversation`, {
      conversationId: conversation.id,
      title: conversation.title,
      activeTab,
      currentConversationId,
      activeSessionId,
      filePath: conversation.filePath,
      messagesCount: conversation.messages.length
    });
    
    if (activeTab === "sessions") {
      console.log(`📋 Sessions tab: Using onSelectConversation callback`);
      if (onSelectConversation) {
        onSelectConversation(conversation);
      } else {
        console.log(`📋 Sessions tab: No callback, setting current conversation`);
        setCurrentConversation(conversation.id);
      }
    } else {
      console.log(`📁 ${activeTab} tab: Setting current conversation directly`);
      setCurrentConversation(conversation.id);
    }
  };

  const filteredConversations = useMemo(() => {
    let allConversations: Conversation[] = [];

    if (activeTab === "favorites") {
      // Favorites tab shows only history conversations that are favorited
      allConversations = historyConversations.filter(
        (c) => favoriteStatuses[c.id],
      );
      console.log(`⭐ Favorites tab: ${allConversations.length} favorited history conversations`);
    } else if (activeTab === "sessions") {
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

    console.log(`🎯 Final filtered conversations for ${activeTab} tab:`, allConversations.map(c => ({
      id: c.id.substring(0, 8),
      title: c.title,
      filePath: c.filePath
    })));

    return allConversations;
  }, [historyConversations, activeConversations, searchQuery, activeTab, favoriteStatuses]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <h3 className="text-sm font-medium text-gray-900">Conversations</h3>
      </div>
      
      {/* Debug Info */}
      <div className="p-2 bg-yellow-50 border-b text-xs text-gray-600">
        <div className="mb-1">
          <strong>Debug Info:</strong>
        </div>
        <div>Active Tab: <span className="font-mono">{activeTab}</span></div>
        <div>Current Session ID: <span className="font-mono">{currentConversationId || 'null'}</span></div>
        <div>Active Session ID: <span className="font-mono">{activeSessionId || 'null'}</span></div>
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
        activeSessionId={activeSessionId}
        onSelectConversation={handleSelectConversation}
        onToggleFavorite={handleToggleFavorite}
        onDeleteConversation={handleDeleteConversation}
        onSelectSession={onSelectSession}
        onKillSession={onKillSession}
      />
    </div>
  );
}
