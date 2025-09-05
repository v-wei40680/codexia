import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { VirtualizedTextRenderer } from '../VirtualizedTextRenderer';
import { StreamingMessage } from '../StreamingMessage';
import type { NormalizedMessage } from '@/types/chat';

interface AgentMessageProps {
  message: NormalizedMessage;
  selectedText?: string;
}

export const AgentMessage: React.FC<AgentMessageProps> = ({ message }) => {
  const shouldUseVirtualizedRenderer = () => {
    const lineCount = message.content.split('\n').length;
    const charCount = message.content.length;
    return lineCount > 100 || charCount > 10000;
  };

  if (message.isStreaming) {
    return (
      <StreamingMessage 
        message={{
          id: message.id,
          role: message.role as "user" | "assistant" | "system",
          content: message.content,
          timestamp: message.timestamp,
          isStreaming: message.isStreaming
        }}
      />
    );
  }

  if (shouldUseVirtualizedRenderer()) {
    return <VirtualizedTextRenderer content={message.content} />;
  }

  return <MarkdownRenderer content={message.content} />;
};