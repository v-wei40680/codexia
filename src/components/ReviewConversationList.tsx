import { useMemo, useEffect } from "react";
import {
  useConversationListStore,
  loadProjectSessions,
} from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { Button } from "./ui/button";
import { invoke } from "@/lib/tauri-proxy";
import { EllipsisVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReviewConversationListProps {
  activeSessionConversationId: string | null;
  onSelectSessionConversation: (conversationId: string) => void;
}

export function ReviewConversationList({
  activeSessionConversationId,
  onSelectSessionConversation,
}: ReviewConversationListProps) {
  const { conversationsByCwd, removeConversation } = useConversationListStore();
  const { cwd } = useCodexStore();

  useEffect(() => {
    if (cwd) {
      console.log("cwd", cwd);
      loadProjectSessions(cwd);
    }
  }, [cwd]);

  const conversations = useMemo(() => {
    return conversationsByCwd[cwd] || [];
  }, [conversationsByCwd, cwd]);

  return (
    <nav className="flex flex-col h-full bg-muted/30 w-64">
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
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (conv.path) {
                            removeConversation(conv.conversationId);
                            await invoke("delete_file", { path: conv.path });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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
