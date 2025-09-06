import { Copy, Check, GitFork } from 'lucide-react';
import { useState } from 'react';
import { MessageNoteActions } from './MessageNoteActions';

interface MessageFooterProps {
  messageId: string;
  messageContent: string;
  messageRole: string;
  timestamp: number;
  selectedText: string;
  messageType?: 'reasoning' | 'tool_call' | 'plan_update' | 'exec_command' | 'normal';
  eventType?: string;
  onFork?: () => void;
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const MessageFooter = ({ 
  messageId, 
  messageContent, 
  messageRole, 
  timestamp, 
  selectedText,
  messageType,
  eventType,
  onFork
}: MessageFooterProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  return (
    <div className="flex items-center justify-between border-t border-border/30 hidden group-hover:flex transition-opacity">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {formatTime(timestamp)}
        </span>
        {messageType && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-accent/40 text-muted-foreground border border-border/40">
            {messageType}
          </span>
        )}
        {eventType && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-accent/30 text-muted-foreground/80 border border-border/30">
            {eventType}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {messageRole === 'user' && onFork && (
          <button
            onClick={onFork}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Fork from this message"
          >
            <GitFork className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-accent rounded transition-colors"
          title={copied ? "Copied!" : "Copy message"}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <MessageNoteActions
          messageId={messageId}
          messageContent={messageContent}
          messageRole={messageRole}
          timestamp={timestamp}
          selectedText={selectedText}
        />
      </div>
    </div>
  );
};
