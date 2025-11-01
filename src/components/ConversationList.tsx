import {
  useMemo,
  useEffect,
  useState,
  useRef,
  type SetStateAction,
  type Dispatch,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { extractInitialMessages, type CodexEvent } from "@/types/chat";
import { v4 } from "uuid";
import { useConversation } from "@/hooks/useCodex";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useEventStore } from "@/stores/useEventStore";
import { renameConversation } from "@/utils/renameConversation";

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
  } = useConversationListStore();
  const {
    activeConversationId,
    setActiveConversationId,
    conversationIds,
    clearPendingConversation,
  } = useActiveConversationStore();
  const { cwd } = useCodexStore();
  const { resumeConversation } = useConversation();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { addEvent } = useEventStore();
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cwd) {
      loadProjectSessions(cwd);
    }
  }, [cwd]);

  useEffect(() => {
    if (editingConversationId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingConversationId]);

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

  const handleSelectConversation = async (
    conversationId: string,
    path: string,
  ) => {
    clearPendingConversation();
    if (!conversationIds.includes(conversationId)) {
      console.log(conversationId, path);
      const resumedConversation = await resumeConversation(
        path,
        buildNewConversationParams,
      );
      console.log(resumedConversation);
      setActiveConversationId(resumedConversation.conversationId);
      useActiveConversationStore
        .getState()
        .addConversationId(resumedConversation.conversationId);
      const initialMessages = extractInitialMessages(resumedConversation);
      if (initialMessages) {
        // Use timestamps far in the past to ensure history always appears before new messages
        const baseTimestamp = Date.now() - 1000000000; // ~11.5 days ago
        initialMessages.forEach(
          (msg: CodexEvent["payload"]["params"]["msg"], index: number) => {
            const timestamp = baseTimestamp + index * 1000;
            addEvent(resumedConversation.conversationId, {
              id: timestamp,
              event: "codex:event",
              payload: {
                method: `codex/event/${msg.type}`,
                params: {
                  conversationId: resumedConversation.conversationId,
                  id: v4(),
                  msg,
                },
              },
              createdAt: timestamp,

            });
          },
        );
      }
    } else {
      setActiveConversationId(conversationId);
    }
    console.log("selected", conversationId);
  };

  const handleRenameSubmit = async (conversationId: string) => {
    await renameConversation({
      conversationId,
      nextPreview: editingValue,
      cwd,
      conversations,
      updateConversationPreview,
    });
    setEditingConversationId(null);
    setEditingValue("");
  };

  return (
    <nav className="flex flex-col h-full bg-muted/30">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {emptyStateMessage}
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {conversations.map((conv) => {
              const isActive = activeConversationId === conv.conversationId;
              const isFavorite = favoriteIds.has(conv.conversationId);
              const isEditing = editingConversationId === conv.conversationId;
              return (
                <li key={conv.conversationId}>
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
                      {isEditing ? (
                        <form
                          className={`flex-1 min-w-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground"
                          }`}
                          onSubmit={(event) => {
                            event.preventDefault();
                            void handleRenameSubmit(conv.conversationId);
                          }}
                        >
                          <Input
                            ref={inputRef}
                            value={editingValue}
                            onChange={(event) =>
                              setEditingValue(event.target.value)
                            }
                            onKeyDown={(event) => {
                              event.stopPropagation();
                              if (event.key === "Escape") {
                                setEditingConversationId(null);
                                setEditingValue("");
                              }
                            }}
                            className="h-7"
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() =>
                            handleSelectConversation(
                              conv.conversationId,
                              conv.path,
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
                      )}
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
                          setEditingValue(conv.preview ?? "");
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
