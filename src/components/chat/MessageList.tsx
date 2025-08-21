import { useRef, useEffect, useMemo, useCallback } from 'react';
import { Bot } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { ChatMessage as CodexMessageType } from '@/types/codex';
import { TextSelectionMenu } from './TextSelectionMenu';
import { Message } from './Message';
import { useTextSelection } from '../../hooks/useTextSelection';

// Unified message type
type UnifiedMessage = ChatMessageType | CodexMessageType;

interface MessageListProps {
  messages: UnifiedMessage[];
  className?: string;
  isLoading?: boolean;
  isPendingNewConversation?: boolean;
}

export function MessageList({ messages, className = "", isLoading = false, isPendingNewConversation = false }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedText } = useTextSelection();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Helper to normalize message data - memoized to prevent re-calculations
  const normalizeMessage = useCallback((msg: UnifiedMessage) => {
    // Check if it's a codex message (has 'type' property)
    if ('type' in msg) {
      return {
        id: msg.id,
        role: msg.type === 'user' ? 'user' : msg.type === 'agent' ? 'assistant' : 'system',
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date().getTime(),
        isStreaming: msg.isStreaming || false
      };
    }
    // It's a chat message (has 'role' property)
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : new Date().getTime(),
      isStreaming: false
    };
  }, []);

  // Memoize normalized messages to avoid re-computation
  const normalizedMessages = useMemo(() => {
    return messages.map(normalizeMessage);
  }, [messages, normalizeMessage]);



  if (messages.length === 0) {
    return (
      <div className={`flex-1 min-h-0 flex items-center justify-center ${className}`}>
        <div className="text-center space-y-4 max-w-md">
          <Bot className="w-12 h-12 text-gray-400 mx-auto" />
          {isPendingNewConversation ? (
            <>
              <h3 className="text-lg font-medium text-gray-800">Ready to start</h3>
              <p className="text-gray-600">
                Type a message below to start your new conversation with the AI assistant.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium text-gray-800">No messages</h3>
              <p className="text-gray-600">
                This conversation doesn't have any messages yet.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${className}`}>
      {/* Single Text Selection Menu for all messages */}
      <TextSelectionMenu />
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="w-full max-w-full min-w-0">
          {normalizedMessages.map((normalizedMessage, index) => (
            <Message
              key={`${normalizedMessage.id}-${index}`}
              message={normalizedMessage}
              index={index}
              isLastMessage={index === messages.length - 1}
              selectedText={selectedText}
            />
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 p-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100">
                  <Bot className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">Assistant</span>
                </div>
                <div className="rounded-lg border p-3 bg-white border-gray-200">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}