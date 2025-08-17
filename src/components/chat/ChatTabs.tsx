import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationItem } from "./ConversationItem";
import { Button } from "@/components/ui/button";
import { Activity, Circle, X } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import type { Conversation } from "@/types/chat";

interface ChatTabsProps {
  filteredConversations: Conversation[];
  searchQuery: string;
  historyConversations: Conversation[];
  favoriteStatuses: Record<string, boolean>;
  currentConversationId: string | null;
  activeSessionId?: string;
  onSelectConversation: (conversation: Conversation) => void;
  onToggleFavorite: (conversationId: string, e: React.MouseEvent) => void;
  onDeleteConversation: (conversationId: string, e: React.MouseEvent) => void;
  onSelectSession?: (sessionId: string) => void;
  onKillSession?: (sessionId: string) => void;
}

export function ChatTabs({
  filteredConversations,
  searchQuery,
  historyConversations,
  favoriteStatuses,
  currentConversationId,
  activeSessionId,
  onSelectConversation,
  onToggleFavorite,
  onDeleteConversation,
  onKillSession,
}: ChatTabsProps) {
  const { conversationListTab, setConversationListTab } = useLayoutStore();
  const renderConversationItem = (
    conversation: Conversation,
    index: number,
    tabPrefix: string,
  ) => {
    const isCurrentlySelected = currentConversationId === conversation.id;
    const isActiveSession = activeSessionId === conversation.id;
    const isFavorited =
      conversationListTab === "favorites"
        ? conversation.isFavorite || false
        : favoriteStatuses[conversation.id] || false;
    const showSessionId = tabPrefix === "sessions";

    // Special rendering for sessions tab
    if (tabPrefix === "sessions") {
      return (
        <div
          key={`${tabPrefix}-${conversation.id}-${index}`}
          className="group relative p-3 rounded-lg cursor-pointer border transition-all hover:bg-white hover:shadow-sm bg-white border-gray-200"
          onClick={() => onSelectConversation(conversation)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Circle className="h-3 w-3 text-green-500 fill-current flex-shrink-0" />
                <h4 className="text-sm font-medium text-gray-900">
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
    }

    // Normal rendering for other tabs
    return (
      <ConversationItem
        key={`${tabPrefix}-${conversation.id}-${index}`}
        conversation={conversation}
        index={index}
        tabPrefix={tabPrefix}
        isCurrentlySelected={isCurrentlySelected}
        isActiveSession={isActiveSession}
        isFavorited={isFavorited}
        showSessionId={showSessionId}
        onSelectConversation={onSelectConversation}
        onToggleFavorite={onToggleFavorite}
        onDeleteConversation={onDeleteConversation}
      />
    );
  };

  const renderEmptyState = () => {
    if (searchQuery) {
      return conversationListTab === "favorites" ? (
        <p>No favorite conversations match your search</p>
      ) : (
        <p>No conversations match your search</p>
      );
    } else if (conversationListTab === "favorites") {
      return (
        <>
          <p>No favorite conversations</p>
          <p className="text-xs mt-1">
            Star some conversations to see them here
          </p>
        </>
      );
    } else if (historyConversations.length === 0) {
      return (
        <>
          <p>No conversations yet</p>
          <p className="text-xs mt-1">
            Create your first conversation to get started
          </p>
        </>
      );
    } else {
      return <p>No conversations to display</p>;
    }
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
          <Activity className="w-3 h-3 mr-1" />
          Sessions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="flex-1 overflow-y-auto mt-0">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {renderEmptyState()}
          </div>
        ) : (
          <div className="space-y-1 p-2 overflow-y-auto">
            {filteredConversations.map((conversation, index) =>
              renderConversationItem(conversation, index, "all"),
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="favorites" className="flex-1 overflow-y-auto mt-0">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {renderEmptyState()}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredConversations.map((conversation, index) =>
              renderConversationItem(conversation, index, "favorites"),
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sessions" className="flex-1 overflow-y-auto mt-0">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <p>No active sessions</p>
            <p className="text-xs mt-1">
              Send a message to create a session
            </p>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {/* Show active conversations from store */}
            {filteredConversations.map((conversation, index) =>
              renderConversationItem(conversation, index, "sessions"),
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}