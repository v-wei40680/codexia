import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationList } from "./ConversationList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Circle, X, Search } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import type { Conversation } from "@/types/chat";
import React, { useMemo } from "react";

interface SearchQueries {
  all: string;
  favorites: string;
  sessions: string;
}

interface ChatTabsProps {
  historyConversations: Conversation[];
  favoriteStatuses: Record<string, boolean>;
  activeConversations: Conversation[];
  currentConversationId: string | null;
  activeSessionId?: string;
  searchQueries: SearchQueries;
  onSearchChange: (queries: SearchQueries) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onToggleFavorite: (conversationId: string, e: React.MouseEvent) => void;
  onDeleteConversation: (conversationId: string, e: React.MouseEvent) => void;
  onSelectSession?: (sessionId: string) => void;
  onKillSession?: (sessionId: string) => void;
}

export function ConversationTabs({
  historyConversations,
  favoriteStatuses,
  activeConversations,
  currentConversationId,
  activeSessionId,
  searchQueries,
  onSearchChange,
  onSelectConversation,
  onToggleFavorite,
  onDeleteConversation,
  onKillSession,
}: ChatTabsProps) {
  const { conversationListTab, setConversationListTab } = useLayoutStore();

  const getFilteredConversations = (tab: string, searchQuery: string) => {
    let conversations: Conversation[] = [];

    if (tab === "favorites") {
      conversations = historyConversations.filter(
        (c) => favoriteStatuses[c.id],
      );
    } else if (tab === "sessions") {
      conversations = activeConversations.filter(conv => 
        conv.id.startsWith('codex-event-') && 
        /\d{13}-[a-z0-9]+$/.test(conv.id.replace('codex-event-', ''))
      );
    } else {
      conversations = historyConversations;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      conversations = conversations.filter(
        (conversation) =>
          conversation.title.toLowerCase().includes(query) ||
          conversation.messages.some((msg) =>
            msg.content.toLowerCase().includes(query),
          ),
      );
    }

    return conversations;
  };

  const filteredConversations = useMemo(() => {
    const currentSearchQuery = searchQueries[conversationListTab as keyof SearchQueries] || '';
    return getFilteredConversations(conversationListTab, currentSearchQuery);
  }, [conversationListTab, searchQueries, historyConversations, activeConversations, favoriteStatuses]);

  const handleSearchChange = (value: string) => {
    onSearchChange({
      ...searchQueries,
      [conversationListTab]: value,
    });
  };
  const renderSessionItem = (conversation: Conversation, index: number) => {
    const isCurrentlySelected = currentConversationId === conversation.id;

    return (
      <div
        key={`sessions-${conversation.id}-${index}`}
        className={`group relative p-3 rounded-lg cursor-pointer border transition-all hover:shadow-sm ${
          isCurrentlySelected 
            ? 'bg-blue-50 border-blue-300 shadow-sm' 
            : 'bg-white border-gray-200 hover:bg-white'
        }`}
        onClick={() => onSelectConversation(conversation)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Circle className="h-3 w-3 text-green-500 fill-current flex-shrink-0" />
              <h4 className={`text-sm font-medium ${
                isCurrentlySelected ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {conversation.title}
                {isCurrentlySelected && (
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (Current)
                  </span>
                )}
              </h4>
            </div>
            <p className="text-xs text-gray-500 font-mono truncate">
              {conversation.id}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-green-600">Active</span>
              <span className="text-xs text-gray-400">
                {conversation.messages.length} messages
              </span>
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onKillSession?.(conversation.id);
              }}
              title="Close Session"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };


  return (
    <Tabs
      value={conversationListTab}
      onValueChange={setConversationListTab}
      className="flex flex-col flex-1"
    >
      <TabsList className="grid w-full grid-cols-3 mt-2">
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="favorites">Favorites</TabsTrigger>
        <TabsTrigger value="sessions">
          Sessions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="flex-1 overflow-y-auto mt-0">
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search all conversations..."
              value={searchQueries.all}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ConversationList
          conversations={filteredConversations}
          currentConversationId={currentConversationId}
          activeSessionId={activeSessionId}
          favoriteStatuses={favoriteStatuses}
          isFav={false}
          onSelectConversation={onSelectConversation}
          onToggleFavorite={onToggleFavorite}
          onDeleteConversation={onDeleteConversation}
        />
      </TabsContent>

      <TabsContent value="favorites" className="flex-1 overflow-y-auto mt-0">
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search favorite conversations..."
              value={searchQueries.favorites}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ConversationList
          conversations={filteredConversations}
          currentConversationId={currentConversationId}
          activeSessionId={activeSessionId}
          favoriteStatuses={favoriteStatuses}
          isFav={true}
          onSelectConversation={onSelectConversation}
          onToggleFavorite={onToggleFavorite}
          onDeleteConversation={onDeleteConversation}
        />
      </TabsContent>

      <TabsContent value="sessions" className="flex-1 overflow-y-auto mt-0">
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Search active sessions..."
              value={searchQueries.sessions}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>No active sessions</p>
            <p className="text-xs mt-1">
              Send a message to create a session
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation, index) =>
              renderSessionItem(conversation, index),
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}