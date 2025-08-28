import { ConversationItem } from "./ConversationItem";
import type { Conversation } from "@/types/chat";

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  activeSessionId?: string;
  favoriteStatuses: Record<string, boolean>;
  isFav: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onToggleFavorite: (conversationId: string, e: React.MouseEvent) => void;
  onDeleteConversation: (conversationId: string, e: React.MouseEvent) => void;
}

export function ConversationList({
  conversations,
  currentConversationId,
  favoriteStatuses,
  isFav,
  onSelectConversation,
  onToggleFavorite,
  onDeleteConversation,
}: ConversationListProps) {
  const tabPrefix = isFav ? "favorites" : "all";

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        {isFav ? (
          <>
            <p>No favorite conversations</p>
            <p className="text-xs mt-1">
              Star some conversations to see them here
            </p>
          </>
        ) : (
          <>
            <p>No conversations yet</p>
            <p className="text-xs mt-1">
              Create your first conversation to get started
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2 overflow-y-auto conversation-list-scroll">
      {conversations.map((conversation: Conversation, index: number) => {
        const isCurrentlySelected = currentConversationId === conversation.id;
        const isFavorited = isFav ? true : favoriteStatuses[conversation.id] || false;

        return (
          <ConversationItem
            key={`${tabPrefix}-${conversation.id}-${index}`}
            conversation={conversation}
            index={index}
            tabPrefix={tabPrefix}
            isCurrentlySelected={isCurrentlySelected}
            isFavorited={isFavorited}
            showSessionId={false}
            onSelectConversation={onSelectConversation}
            onToggleFavorite={onToggleFavorite}
            onDeleteConversation={onDeleteConversation}
          />
        );
      })}
    </div>
  );
}