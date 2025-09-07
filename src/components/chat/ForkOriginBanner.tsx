import React from 'react';
import { CornerUpLeft } from 'lucide-react';
import { useConversationStore } from '@/stores/ConversationStore';

interface ForkOriginBannerProps {
  fromConversationId: string;
  parentMessageId?: string;
}

// Small banner that appears in a forked conversation and lets users jump
// back to the source conversation. Keeps UI lightweight and unobtrusive.
export const ForkOriginBanner: React.FC<ForkOriginBannerProps> = ({
  fromConversationId,
  parentMessageId,
}) => {
  const { setCurrentConversation } = useConversationStore();

  const handleJump = () => {
    if (fromConversationId) {
      setCurrentConversation(fromConversationId);
    }
  };

  return (
    <div className="px-2 pt-2">
      <div className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/40">
        <div className="text-sm text-muted-foreground truncate">
          Forked from <span className="font-mono text-foreground/80">{fromConversationId}</span>
          {parentMessageId ? (
            <span className="text-muted-foreground/80"> at message {parentMessageId}</span>
          ) : null}
        </div>
        <button
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          onClick={handleJump}
          title="Go to source conversation"
        >
          <CornerUpLeft className="w-3.5 h-3.5" />
          View source
        </button>
      </div>
    </div>
  );
};

