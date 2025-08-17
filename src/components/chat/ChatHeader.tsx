import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { History, X } from 'lucide-react';

interface ChatHeaderProps {
  isConnected: boolean;
  isHistoryView?: boolean;
  historyMessageCount?: number;
  sessionId?: string;
  sessionName?: string;
  onClearHistory?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  isConnected, 
  isHistoryView = false,
  historyMessageCount = 0,
  onClearHistory 
}) => {
  return (
    <div className="flex-shrink-0 border-b p-2 flex items-center justify-between bg-white z-10">
      <div className="flex items-center gap-2">
        {isHistoryView ? (
          <>
            <History className="w-5 h-5 text-blue-600" />
            <span className="text-lg font-semibold">History View ({historyMessageCount} messages)</span>
          </>
        ) : (
          <span className="text-lg font-semibold">Codex Chat</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isHistoryView && onClearHistory && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearHistory}
            className="h-8 px-2"
          >
            <X className="w-4 h-4 mr-1" />
            Clear History
          </Button>
        )}
        <Badge variant={isConnected ? "default" : "destructive"}>
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </div>
    </div>
  );
};