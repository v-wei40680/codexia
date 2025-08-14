import React, { useState } from 'react';
import { Bot, Send, ArrowLeft } from 'lucide-react';
import { MessageList } from './MessageList';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Conversation } from '@/types/chat';

interface ConversationViewerProps {
  conversation: Conversation | null;
  onContinueConversation?: (message: string) => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function ConversationViewer({ conversation, onContinueConversation, onBack, isLoading }: ConversationViewerProps) {
  const [inputValue, setInputValue] = useState('');

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <Bot className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800">
            No conversation selected
          </h2>
          <p className="text-gray-600">
            Select a conversation from the list to view its messages.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleSendMessage = () => {
    if (inputValue.trim() && onContinueConversation) {
      onContinueConversation(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Bot className="w-5 h-5 text-gray-500" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-medium text-gray-900 truncate">
              {conversation.title}
            </h1>
            <p className="text-sm text-gray-500">
              {conversation.messages.length} messages • {formatDate(conversation.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList 
        messages={conversation.messages} 
        className="flex-1 overflow-hidden"
      />

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-white p-4">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Continue this conversation..."
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={!onContinueConversation}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !onContinueConversation || isLoading}
            size="lg"
            className="px-4 py-2 h-[60px]"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {!onContinueConversation && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Continue conversation functionality is not available in this view
          </p>
        )}
      </div>
    </div>
  );
}