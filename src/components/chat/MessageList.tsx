import { useRef, useEffect } from 'react';
import { Bot, User, Terminal } from 'lucide-react';
import type { ChatMessage } from '@/types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  className?: string;
}

export function MessageList({ messages, className = "" }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isLastMessage = index === messages.length - 1;

    return (
      <div
        key={`${message.timestamp}-${index}`}
        className={`flex gap-3 p-4 ${isLastMessage ? 'mb-4' : ''}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-blue-100' : 'bg-green-100'
          }`}>
            {getMessageIcon(message.role)}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 capitalize">
              {message.role === 'assistant' ? 'Assistant' : message.role}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Content */}
          <div className={`rounded-lg border p-3 ${getMessageStyle(message.role)}`}>
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (messages.length === 0) {
    return (
      <div className={`flex-1 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-4 max-w-md">
          <Bot className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-medium text-gray-800">No messages</h3>
          <p className="text-gray-600">
            This conversation doesn't have any messages yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="max-w-4xl mx-auto">
          {messages.map((message, index) => renderMessage(message, index))}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}