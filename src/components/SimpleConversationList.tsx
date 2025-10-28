import { useMemo, useEffect } from "react";
import {
  useConversationListStore,
  loadProjectSessions,
} from "@/stores/useConversationListStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { Button } from "./ui/button";
import { invoke } from "@/lib/tauri-proxy";
import { Trash2 } from "lucide-react";

interface SimpleConversationListProps {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export function SimpleConversationList({
  activeConversationId,
  setActiveConversationId,
}: SimpleConversationListProps) {
  const { conversationsByCwd } = useConversationListStore();
  const { cwd } = useCodexStore();

  useEffect(() => {
    if (cwd) {
      console.log("cwd", cwd);
      loadProjectSessions(cwd);
    }
  }, [cwd]);

  const conversations = useMemo(() => {
    return conversationsByCwd[cwd || ""] || [];
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
              const isActive = activeConversationId === conv.conversationId;
              return (
                <li key={conv.conversationId} className="flex">
                  <button
                    onClick={() => {
                      setActiveConversationId(conv.conversationId);
                      console.log("selected", conv.conversationId);
                    }}
                    className={`flex-1 min-w-0 truncate text-left rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span className="truncate">{conv.preview}</span>
                  </button>

                  <Button
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (conv.path) {
                        useConversationListStore
                          .getState()
                          .removeConversation(conv.conversationId);
                        await invoke("delete_file", { path: conv.path });
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
