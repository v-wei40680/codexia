import {
  useMemo,
  useEffect,
  useState,
  type SetStateAction,
  type Dispatch,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  MoreVertical,
  Star,
  StarOff,
  FolderPlus,
  Pencil,
} from "lucide-react";
import { invoke } from "@/lib/tauri-proxy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useConversationListStore,
  loadProjectSessions,
} from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { Checkbox } from "@/components/ui/checkbox";
import { useResumeConversation } from "@/hooks/useResumeConversation";
import { renameConversation } from "@/utils/renameConversation";
import RenameDialog from "@/components/RenameDialog";

interface ConversationListProps {
  mode: string;
  searchQuery?: string;
  selectedCategoryId?: string | null;
  conversationCategoryMap?: Record<string, string | undefined>;
  onRequestCategoryAssignment?: (conversationId: string) => void;
  showBulkDeleteButtons: boolean;
  selectedConversations: Set<string>;
  setSelectedConversations: Dispatch<SetStateAction<Set<string>>>;
}

export function ConversationList({
  mode = "all",
  searchQuery = "",
  selectedCategoryId = null,
  conversationCategoryMap,
  onRequestCategoryAssignment,
  showBulkDeleteButtons,
  selectedConversations,
  setSelectedConversations,
}: ConversationListProps) {
  const {
    conversationsByCwd,
    favoriteConversationIdsByCwd,
    toggleFavorite,
    updateConversationPreview,
    loadedAllByCwd,
    hasMoreByCwd,
  } = useConversationListStore();
  const { activeConversationId } = useActiveConversationStore();
  const { cwd } = useCodexStore();
  const { handleSelectConversation } = useResumeConversation();
  const [editingConversationId, setEditingConversationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (cwd) {
      loadProjectSessions(cwd);
    }
  }, [cwd]);

  // No inline focus; handled by RenameDialog

  const favoriteIds = useMemo(() => {
    const list = favoriteConversationIdsByCwd[cwd || ""] ?? [];
    return new Set(list);
  }, [favoriteConversationIdsByCwd, cwd]);

  const conversations = useMemo(() => {
    const base = conversationsByCwd[cwd || ""] || [];
    const sorted = [...base].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
    const query = searchQuery.trim().toLowerCase();
    return sorted.filter((conv) => {
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

  const loadedAll = loadedAllByCwd[cwd || ""] ?? false;
  const hasMore = hasMoreByCwd[cwd || ""] ?? false;

  const handleRenameSubmit = async (
    conversationId: string,
    nextPreview: string,
  ) => {
    await renameConversation({
      conversationId,
      nextPreview,
      cwd,
      conversations,
      updateConversationPreview,
    });
    setEditingConversationId(null);
  };

  return (
    <nav className="flex flex-col h-full bg-muted/30">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const isActive = activeConversationId === conv.conversationId;
              const isFavorite = favoriteIds.has(conv.conversationId);
              return (
                <div key={conv.conversationId}>
                  <li className="group">
                    <DropdownMenu>
                      <div className="flex items-center justify-between w-full">
                        {showBulkDeleteButtons && (
                          <Checkbox
                            checked={selectedConversations.has(
                              conv.conversationId,
                            )}
                            onCheckedChange={(checked) => {
                              setSelectedConversations((prev) => {
                                const next = new Set(prev);
                                if (checked) {
                                  next.add(conv.conversationId);
                                } else {
                                  next.delete(conv.conversationId);
                                }
                                return next;
                              });
                            }}
                            className="mr-2"
                          />
                        )}
                        <button
                          onClick={() =>
                            handleSelectConversation(
                              conv.conversationId,
                              conv.path,
                              cwd,
                            )
                          }
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
                          onClick={async (event) => {
                            event.stopPropagation();
                            await toggleFavorite(conv.conversationId);
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
                            setEditingConversationId(conv.conversationId);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
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
                              useConversationListStore
                                .getState()
                                .removeConversation(conv.conversationId);
                              await invoke("delete_file", { path: conv.path });
                            }
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="hidden group-hover:flex justify-between px-4 text-xs text-muted-foreground">
                      <span>{conv.timestamp?.split("T")[0]}</span>
                      <span>{conv.source}</span>
                    </span>
                  </li>
                </div>
              );
            })}
          </ul>
        )}
      </div>
      <RenameDialog
        open={editingConversationId !== null}
        initialValue={
          conversations.find((c) => c.conversationId === editingConversationId)
            ?.preview || ""
        }
        title="Rename Conversation"
        label="New name"
        onOpenChange={(open) => {
          if (!open) {
            setEditingConversationId(null);
          }
        }}
        onCancel={() => setEditingConversationId(null)}
        onSubmit={(value) => {
          if (editingConversationId) {
            void handleRenameSubmit(editingConversationId, value);
          }
        }}
      />
      {!loadedAll && hasMore ? (
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              if (cwd) {
                void loadProjectSessions(cwd, true);
              }
            }}
          >
            Load all
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
