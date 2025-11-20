import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { invoke } from "@/lib/tauri-proxy";
import { ConversationSummary } from "@/bindings/ConversationSummary";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useAuth } from "@/hooks/useAuth";
import { LoginRequire } from "@/components/common/LoginRequire";

interface BulkDeleteButtonsProps {
  showBulkDeleteButtons: boolean;
  setShowBulkDeleteButtons: (show: boolean) => void;
  selectedConversations: Set<string>;
  setSelectedConversations: (conversations: Set<string>) => void;
  conversations: ConversationSummary[];
}

export function BulkDeleteButtons({
  showBulkDeleteButtons,
  setShowBulkDeleteButtons,
  selectedConversations,
  setSelectedConversations,
  conversations,
}: BulkDeleteButtonsProps) {
  const { removeConversation } = useConversationListStore();
  const { user, loading } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  return (
    <div className="flex items-center justify-end">
      <LoginRequire
        open={loginDialogOpen}
        onOpenChange={(open) => setLoginDialogOpen(open)}
      />
      {showBulkDeleteButtons ? (
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="icon"
            className="bg-red-500"
            onClick={async () => {
              for (const convId of selectedConversations) {
                const conv = conversations.find(c => c.conversationId === convId);
                if (conv?.path) {
                  removeConversation(conv.conversationId);
                  await invoke('delete_file', { path: conv.path });
                }
              }
              setSelectedConversations(new Set());
              setShowBulkDeleteButtons(false);
            }}
            disabled={selectedConversations.size === 0}
          >
            <Trash2 />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowBulkDeleteButtons(false);
              setSelectedConversations(new Set());
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (!import.meta.env.DEV && !user) {
              if (!loading) {
                setLoginDialogOpen(true);
              }
              return;
            }
            setShowBulkDeleteButtons(true);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
