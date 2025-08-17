import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Trash2,
  Star,
  StarOff,
  MessageSquare,
  Circle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation } from "@/types/chat";

interface ConversationItemProps {
  conversation: Conversation;
  index: number;
  tabPrefix: string;
  isCurrentlySelected: boolean;
  isActiveSession: boolean;
  isFavorited: boolean;
  showSessionId?: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onToggleFavorite: (conversationId: string, e: React.MouseEvent) => void;
  onDeleteConversation: (conversationId: string, e: React.MouseEvent) => void;
}

export function ConversationItem({
  conversation,
  index,
  tabPrefix,
  isCurrentlySelected,
  isActiveSession,
  isFavorited,
  showSessionId = false,
  onSelectConversation,
  onToggleFavorite,
  onDeleteConversation,
}: ConversationItemProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getPreviewText = (conversation: Conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage) {
      return lastMessage.content.length > 100
        ? lastMessage.content.substring(0, 100) + "..."
        : lastMessage.content;
    }
    return "No messages yet";
  };

  return (
    <div
      key={`${tabPrefix}-${conversation.id}-${index}`}
      className={cn(
        "group relative p-3 rounded-lg cursor-pointer border transition-all hover:bg-white hover:shadow-sm",
        isActiveSession
          ? "bg-blue-50 border-blue-200 shadow-sm ring-2 ring-blue-100"
          : isCurrentlySelected
            ? "bg-gray-50 border-gray-200 shadow-sm"
            : "bg-white border-transparent hover:border-gray-200",
      )}
      onClick={() => onSelectConversation(conversation)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isActiveSession ? (
              <Circle className="h-3 w-3 text-green-500 fill-current flex-shrink-0" />
            ) : (
              <MessageSquare className="h-3 w-3 text-gray-400 flex-shrink-0" />
            )}
            <h4
              className={cn(
                "text-sm font-medium truncate flex-1",
                isActiveSession ? "text-blue-900" : "text-gray-900",
              )}
            >
              {conversation.title}
              {isActiveSession && (
                <span className="ml-1 text-xs text-blue-600 font-normal">
                  (Active)
                </span>
              )}
            </h4>
            {isFavorited && (
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {getPreviewText(conversation)}
          </p>
          {showSessionId && (
            <div className="mt-1 mb-1">
              <span className="text-xs text-blue-600 font-mono bg-blue-50 px-1 py-0.5 rounded">
                ID: {conversation.id.substring(0, 8)}...
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {formatDate(conversation.updatedAt)}
            </span>
            <span className="text-xs text-gray-400">
              {conversation.messages.length} messages
            </span>
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => onToggleFavorite(conversation.id, e)}
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
                  onClick={(e) => onDeleteConversation(conversation.id, e)}
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
}