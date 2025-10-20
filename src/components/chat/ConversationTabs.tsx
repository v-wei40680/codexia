import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationList } from "./ConversationList";
import { SearchInput } from "@/components/common/SearchInput";
import { useLayoutStore } from "@/stores/layoutStore";
import type { Conversation } from "@/types/chat";
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ListCheck } from "lucide-react";
import { ConversationCategoryDialog } from "@/components/chat/ConversationCategoryDialog";

interface ChatTabsProps {
  favoriteStatuses: Record<string, boolean>;
  activeConversations: Conversation[];
  currentConversationId: string | null;
  activeSessionId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onToggleFavorite: (conversationId: string, e: React.MouseEvent) => void;
  onDeleteConversation: (conversationId: string, e: React.MouseEvent) => void;
  onSelectSession?: (sessionId: string) => void;
  categories: { id: string; name: string }[];
  selectedCategoryId: string | null;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  setSelectedCategory: (id: string | null) => void;
}

export function ConversationTabs({
  favoriteStatuses,
  activeConversations,
  currentConversationId,
  activeSessionId,
  searchQuery,
  onSearchChange,
  onSelectConversation,
  onToggleFavorite,
  onDeleteConversation,
  onSelectSession,
  categories,
  selectedCategoryId,
  addCategory,
  deleteCategory,
  setSelectedCategory,
}: ChatTabsProps) {
  const { conversationListTab, setConversationListTab } = useLayoutStore();

  const [categoryOpen, setCategoryOpen] = useState(false);

  const getFilteredConversations = (tab: string, searchQuery: string) => {
    let conversations: Conversation[] = [];

    if (tab === "favorites") {
      conversations = activeConversations.filter(
        (c) => favoriteStatuses[c.id],
      );
    } else if (tab === "sessions") {
      conversations = activeConversations.filter(conv => 
        conv.id.startsWith('codex-event-') && 
        /\d{13}-[a-z0-9]+$/.test(conv.id.replace('codex-event-', ''))
      );
    } else {
      conversations = activeConversations;
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
    return getFilteredConversations(conversationListTab, searchQuery);
  }, [conversationListTab, searchQuery, activeConversations, favoriteStatuses]);

  return (
    <Tabs
      value={conversationListTab}
      onValueChange={setConversationListTab}
      className="flex flex-col h-full"
    >
      <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
        <TabsTrigger value="sessions">Sessions</TabsTrigger>
        <TabsTrigger value="favorites">Favorites</TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-y-auto mt-0">
        <div className="flex items-center">
          <SearchInput
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={onSearchChange}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCategoryOpen(true)}
          >
            <ListCheck className="h-4 w-4" />
          </Button>
        </div>
        <ConversationCategoryDialog
          open={categoryOpen}
          onOpenChange={setCategoryOpen}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onSelectCategory={setSelectedCategory}
        />
        <ConversationList
          conversations={filteredConversations}
          currentConversationId={currentConversationId}
          activeSessionId={activeSessionId}
          favoriteStatuses={favoriteStatuses}
          isFav={conversationListTab === "favorites"}
          onSelectConversation={onSelectConversation}
          onToggleFavorite={onToggleFavorite}
          onDeleteConversation={onDeleteConversation}
          onSelectSession={conversationListTab === "sessions" ? onSelectSession : undefined}
        />
      </div>
    </Tabs>
  );
}