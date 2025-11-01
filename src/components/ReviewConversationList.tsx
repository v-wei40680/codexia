import { useMemo, useEffect, useState, useRef } from "react";
import {
  useConversationListStore,
  loadProjectSessions,
} from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { invoke } from "@/lib/tauri-proxy";
import { EllipsisVertical, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { renameConversation } from "@/utils/renameConversation";

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
  const [editingValue, setEditingValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cwd) {
      console.log("cwd", cwd);
      loadProjectSessions(cwd);
    }
  }, [cwd]);

  useEffect(() => {
    if (editingConversationId) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingConversationId]);

  const conversations = useMemo(() => {
    return conversationsByCwd[cwd] || [];
  }, [conversationsByCwd, cwd]);

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
                  {editingConversationId === conv.conversationId ? (
                    <form
                      className={`flex-1 min-w-0 rounded-md px-3 py-1.5 text-sm font-medium ${
                        activeSessionConversationId === conv.conversationId
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
                        onChange={(event) => setEditingValue(event.target.value)}
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
                  )}

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
                          setEditingValue(conv.preview ?? "");
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
    </nav>
  );
}
