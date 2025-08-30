import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { MessageNoteActions } from './MessageNoteActions';

interface MessageFooterProps {
  messageId: string;
  messageContent: string;
  messageRole: string;
  timestamp: number;
  selectedText: string;
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
  selectedText 
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
    <div className="flex items-center justify-between border-t border-border/30 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {formatTime(timestamp)}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
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