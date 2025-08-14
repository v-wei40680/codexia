import { cn } from "@/lib/utils";
import { useConversationStore } from "@/stores/ConversationStore";
import { sessionLoader } from "@/services/sessionLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, Trash2, Search, Star, StarOff, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo, useEffect } from "react";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  onCreateNewSession?: () => void;
}

export function ConversationList({ onSelectConversation, onCreateNewSession }: ConversationListProps) {
  const {
    conversations: favoriteConversations,
    currentConversationId,
    createConversation,
    setCurrentConversation,
    deleteConversation,
  } = useConversationStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [historyConversations, setHistoryConversations] = useState<Conversation[]>([]);
  const [favoriteStatuses, setFavoriteStatuses] = useState<Record<string, boolean>>({});

  // Load history conversations from disk
  useEffect(() => {
    const loadHistory = async () => {
      try {
        console.log('Starting to load sessions from disk...');
        const history = await sessionLoader.loadSessionsFromDisk();
        console.log('Loaded conversations:', history.length, 'conversations');
        console.log('Conversation dates:', history.map(c => new Date(c.updatedAt).toDateString()));
        setHistoryConversations(history);
        
        // Check favorite status for each conversation
        const statuses: Record<string, boolean> = {};
        for (const conv of history) {
          statuses[conv.id] = await sessionLoader.isConversationFavorited(conv.id);
        }
        setFavoriteStatuses(statuses);
      } catch (error) {
        console.error('Failed to load history conversations:', error);
      }
    };

    loadHistory();
  }, []);


  const handleCreateConversation = () => {
    if (onCreateNewSession) {
      // Create a real chat session instead of just a conversation in store
      onCreateNewSession();
    } else {
      // Fallback to creating only in store (for when used in other contexts)
      const newId = createConversation();
      setCurrentConversation(newId);
    }
  };

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(conversationId);
  };
  
  const handleToggleFavorite = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await sessionLoader.toggleFavorite(conversationId);
      
      // Update local favorite status
      setFavoriteStatuses(prev => ({
        ...prev,
        [conversationId]: !prev[conversationId]
      }));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    } else {
      setCurrentConversation(conversation.id);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  const filteredConversations = useMemo(() => {
    let allConversations: Conversation[] = [];
    
    if (activeTab === "favorites") {
      // Show only favorited conversations from store
      allConversations = favoriteConversations.filter(c => c.isFavorite);
    } else {
      // Show all history conversations from disk
      allConversations = historyConversations;
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allConversations = allConversations.filter(conversation => 
        conversation.title.toLowerCase().includes(query) ||
        conversation.messages.some(msg => 
          msg.content.toLowerCase().includes(query)
        )
      );
    }
    
    return allConversations;
  }, [favoriteConversations, historyConversations, searchQuery, activeTab]);

  const getPreviewText = (conversation: Conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      return lastMessage.content.length > 100 
        ? lastMessage.content.substring(0, 100) + "..."
        : lastMessage.content;
    }
    return "No messages yet";
  };

  const renderConversationItem = (conversation: Conversation, index: number, tabPrefix: string) => {
    const isCurrentlySelected = currentConversationId === conversation.id;
    const isFavorited = activeTab === "favorites" 
      ? conversation.isFavorite 
      : favoriteStatuses[conversation.id];

    return (
      <div
        key={`${tabPrefix}-${conversation.id}-${index}`}
        className={cn(
          "group relative p-3 rounded-lg cursor-pointer border transition-all hover:bg-white hover:shadow-sm",
          isCurrentlySelected
            ? "bg-blue-50 border-blue-200 shadow-sm"
            : "bg-white border-transparent hover:border-gray-200"
        )}
        onClick={() => handleSelectConversation(conversation)}
      >
        <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <h4 className="text-sm font-medium text-gray-900 truncate flex-1">
              {conversation.title}
            </h4>
            {isFavorited && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {getPreviewText(conversation)}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatDate(conversation.updatedAt)}
            </span>
            <span className="text-xs text-gray-400">
              {conversation.messages.length} messages
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => handleToggleFavorite(conversation.id, e)}
            >
              {isFavorited ? (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              ) : (
                <StarOff className="h-3 w-3" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <h3 className="text-sm font-medium text-gray-900">Conversations</h3>
        <Button
          onClick={handleCreateConversation}
          size="sm"
          className="h-7 w-7 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Search */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
        <TabsList className="grid w-full grid-cols-2 mt-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="flex-1 overflow-y-auto mt-0">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {searchQuery ? (
                <p>No conversations match your search</p>
              ) : activeTab === "favorites" ? (
                <>
                  <p>No favorite conversations</p>
                  <p className="text-xs mt-1">Star some conversations to see them here</p>
                </>
              ) : historyConversations.length === 0 ? (
                <>
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Create your first conversation to get started</p>
                </>
              ) : (
                <p>No conversations to display</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2 overflow-y-auto">
              {filteredConversations.map((conversation, index) => 
                renderConversationItem(conversation, index, 'all')
              )}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="favorites" className="flex-1 overflow-y-auto mt-0">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {searchQuery ? (
                <p>No favorite conversations match your search</p>
              ) : (
                <>
                  <p>No favorite conversations</p>
                  <p className="text-xs mt-1">Star some conversations to see them here</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation, index) => 
                renderConversationItem(conversation, index, 'favorites')
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}