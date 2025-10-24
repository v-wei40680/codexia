import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, MoreVertical, Star, StarOff, FolderPlus } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";

interface ConversationListProps {
  mode?: "all" | "favorites";
  searchQuery?: string;
  selectedCategoryId?: string | null;
  conversationCategoryMap?: Record<string, string | undefined>;
  onRequestCategoryAssignment?: (conversationId: string) => void;
}

export function ConversationList({
  mode = "all",
  searchQuery = "",
  selectedCategoryId = null,
  conversationCategoryMap,
  onRequestCategoryAssignment,
}: ConversationListProps) {
  const {
    conversationsByCwd,
    favoriteConversationIdsByCwd,
    toggleFavorite,
  } = useConversationListStore();
  const { activeConversationId, setActiveConversationId } = useActiveConversationStore();
  const { cwd } = useCodexStore();

  const favoriteIds = useMemo(() => {
    const list = favoriteConversationIdsByCwd[cwd || ""] ?? [];
    return new Set(list);
  }, [favoriteConversationIdsByCwd, cwd]);

  const conversations = useMemo(() => {
    const base = (conversationsByCwd[cwd || ""] || []).slice().reverse();
    const query = searchQuery.trim().toLowerCase();
    return base.filter((conv) => {
      if (mode === "favorites" && !favoriteIds.has(conv.conversationId)) {
        return false;
      }

      if (
        selectedCategoryId &&
        conversationCategoryMap &&
        conversationCategoryMap[conv.conversationId] !== selectedCategoryId
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return conv.preview.toLowerCase().includes(query);
    });
  }, [
    conversationsByCwd,
    cwd,
    mode,
    favoriteIds,
    searchQuery,
    selectedCategoryId,
    conversationCategoryMap,
  ]);

  const emptyStateMessage = useMemo(() => {
    if (searchQuery.trim()) {
      return "No conversations match your search.";
    }

    if (mode === "favorites") {
      return "No favorite conversations yet.";
    }

    return "No conversations yet.";
  }, [mode, searchQuery]);

  return (
    <nav className="flex flex-col h-full bg-muted/30">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">{emptyStateMessage}</div>
        ) : (
          <ul className="space-y-1 p-2">
            {conversations.map((conv) => {
              const isActive = activeConversationId === conv.conversationId;
              const isFavorite = favoriteIds.has(conv.conversationId);
              return (
                <li key={conv.conversationId}>
                  <DropdownMenu>
                    <div className="flex items-center justify-between w-full">
                      <button
                        onClick={() => setActiveConversationId(conv.conversationId)}
                        className={`flex-1 min-w-0 truncate text-left rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="truncate">{conv.preview}</span>
                          {isFavorite ? (
                            <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                          ) : null}
                        </span>
                      </button>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="ml-1">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </div>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(conv.conversationId);
                        }}
                      >
                        {isFavorite ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Remove favorite
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Add favorite
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onRequestCategoryAssignment?.(conv.conversationId);
                        }}
                      >
                        <FolderPlus className="h-4 w-4 mr-2" />
                        Add to category
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (conv.path) {
                            useConversationListStore.getState().removeConversation(conv.conversationId);
                            await invoke('delete_file', { path: conv.path });
                          }
                        }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
