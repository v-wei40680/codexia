import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Bot, ChevronUp, ChevronDown } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types/chat';
import type { ChatMessage as CodexMessageType } from '@/types/codex';
import { TextSelectionMenu } from './TextSelectionMenu';
import { Message } from './Message';
import { MessageHeader } from './MessageHeader';
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const { selectedText } = useTextSelection();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);


  const jumpToTop = useCallback(() => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const jumpToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // Check if scroll buttons should be shown
  const checkScrollButtons = useCallback(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const shouldShow = container.scrollHeight > container.clientHeight + 100; // 100px threshold
      setShowScrollButtons(shouldShow);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
    checkScrollButtons();
  }, [messages, scrollToBottom, checkScrollButtons]);

  // Check scroll buttons on resize
  useEffect(() => {
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkScrollButtons]);

  // Helper to normalize message data - memoized to prevent re-calculations
  const normalizeMessage = useCallback((msg: UnifiedMessage) => {
    // Check if it's a codex message (has 'type' property)
    if ('type' in msg) {
      return {
        id: msg.id,
        role: msg.type === 'user' ? 'user' : msg.type === 'agent' ? 'assistant' : 'system',
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : new Date().getTime(),
        isStreaming: msg.isStreaming || false,
        model: 'model' in msg ? (msg.model as string) : undefined,
        workingDirectory: 'workingDirectory' in msg ? (msg.workingDirectory as string) : undefined
      };
    }
    // It's a chat message (has 'role' property)
    return {
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: typeof msg.timestamp === 'number' ? msg.timestamp : new Date().getTime(),
      isStreaming: false,
      model: msg.model as string | undefined,
      workingDirectory: msg.workingDirectory as string | undefined
    };
  }, []);

  // Memoize normalized messages to avoid re-computation
  const normalizedMessages = useMemo(() => {
    return messages.map(normalizeMessage);
  }, [messages, normalizeMessage]);

  // Extract working directory from the first message that has environment context
  const workingDirectory = useMemo(() => {
    const result = normalizedMessages.find(msg => msg.workingDirectory)?.workingDirectory;
    console.log("🔍 MessageList workingDirectory:", { result, messagesWithWD: normalizedMessages.filter(msg => msg.workingDirectory) });
    return result;
  }, [normalizedMessages]);



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
    <div className={`flex flex-col flex-1 min-h-0 min-w-0 relative ${className}`}>
      {/* Message Header */}
      <MessageHeader 
        workingDirectory={workingDirectory as string | undefined}
      />
      {/* Single Text Selection Menu for all messages */}
      <TextSelectionMenu />
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-2 py-2"
        onScroll={checkScrollButtons}
      >
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
            <div>
              <div className="w-full min-w-0">
                <div className="rounded-lg border px-3 py-2 bg-white border-gray-200">
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
      
      {/* Jump Navigation Buttons */}
      {showScrollButtons && (
        <div className="absolute right-4 bottom-20 flex flex-col gap-1 z-10">
          <button
            onClick={jumpToTop}
            className="bg-white border border-gray-200 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
            title="跳到顶部"
          >
            <ChevronUp className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={jumpToBottom}
            className="bg-white border border-gray-200 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors"
            title="跳到底部"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
}