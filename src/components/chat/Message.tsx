import { memo } from 'react';
import { Bot, User, Terminal } from 'lucide-react';
import { MessageNoteActions } from './MessageNoteActions';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StreamingMessage } from '../StreamingMessage';

interface NormalizedMessage {
  id: string;
  role: string;
  content: string;
  timestamp: number;
  isStreaming: boolean;
}

interface MessageProps {
  message: NormalizedMessage;
  index: number;
  isLastMessage: boolean;
  selectedText: string;
}

const getMessageIcon = (role: string) => {
  switch (role) {
    case 'user':
      return <User className="w-5 h-5 text-blue-600" />;
    case 'assistant':
      return <Bot className="w-5 h-5 text-green-600" />;
    case 'system':
      return <Terminal className="w-5 h-5 text-gray-600" />;
    default:
      return <div className="w-5 h-5 bg-gray-400 rounded-full" />;
  }
};

const getMessageStyle = (role: string) => {
  switch (role) {
    case 'user':
      return 'bg-blue-50 border-blue-200';
    case 'assistant':
      return 'bg-white border-gray-200';
    case 'system':
      return 'bg-gray-50 border-gray-300';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const Message = memo<MessageProps>(({ 
  message: normalized, 
  index, 
  isLastMessage, 
  selectedText 
}) => {
  const isUser = normalized.role === 'user';

  return (
    <div
      key={`${normalized.id}-${index}`}
      className={`group flex gap-3 p-4 min-w-0 ${isLastMessage ? 'mb-4' : ''}`}
      data-message-role={normalized.role}
      data-message-timestamp={normalized.timestamp}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-100' : 'bg-green-100'
        }`}>
          {getMessageIcon(normalized.role)}
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {normalized.role === 'assistant' ? 'Assistant' : normalized.role}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(normalized.timestamp)}
            </span>
          </div>
          
          {/* Note actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageNoteActions
              messageId={normalized.id}
              messageContent={normalized.content}
              messageRole={normalized.role}
              timestamp={normalized.timestamp}
              selectedText={selectedText}
            />
          </div>
        </div>

        {/* Content */}
        <div className={`relative rounded-lg border p-3 w-full min-w-0 ${getMessageStyle(normalized.role)}`}>
          <div className="break-words overflow-wrap-anywhere min-w-0">
            {normalized.isStreaming ? (
              <StreamingMessage 
                message={{
                  id: normalized.id,
                  role: normalized.role as "user" | "assistant" | "system",
                  content: normalized.content,
                  timestamp: normalized.timestamp,
                  isStreaming: normalized.isStreaming
                }}
              />
            ) : (
              <MarkdownRenderer content={normalized.content} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});