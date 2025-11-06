import { useMemo, useEffect, useState } from "react";
import {
  useConversationListStore,
  loadProjectSessions,
} from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { Button } from "./ui/button";
import { invoke } from "@/lib/tauri-proxy";
import { EllipsisVertical, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renameConversation } from "@/utils/renameConversation";
import RenameDialog from "@/components/RenameDialog";

interface ReviewConversationListProps {
  activeSessionConversationId: string | null;
  onSelectSessionConversation: (conversationId: string) => void;
}

export function ReviewConversationList({
  activeSessionConversationId,
  onSelectSessionConversation,
}: ReviewConversationListProps) {
  const { conversationsByCwd, removeConversation, updateConversationPreview } =
    useConversationListStore();
  const { cwd } = useCodexStore();
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (cwd) {
      console.log("cwd", cwd);
      loadProjectSessions(cwd);
    }
  }, [cwd]);

  // Focus handled by RenameDialog

  const conversations = useMemo(() => {
    const base = conversationsByCwd[cwd || ""] || [];
    return [...base].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversationsByCwd, cwd]);

  const { loadedAllByCwd, hasMoreByCwd } = useConversationListStore();
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
    <nav className="flex h-full min-h-0 flex-col bg-muted/30 w-64 flex-shrink-0">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            No conversations yet.
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {conversations.map((conv) => {
              return (
                <li key={conv.conversationId} className="flex">
                  <button
                      onClick={() => {
                        onSelectSessionConversation(conv.conversationId);
                      }}
                      className={`flex-1 min-w-0 truncate text-left rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                        activeSessionConversationId === conv.conversationId
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span className="truncate">{conv.preview}</span>
                    </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (conv.path) {
                            removeConversation(conv.conversationId);
                            await invoke("delete_file", { path: conv.path });
                          }
                        }}
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
