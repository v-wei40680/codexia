import React from 'react';
import { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

interface StreamingMessageProps {
  message: ChatMessage;
  className?: string;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ 
  message, 
  className 
}) => {
  return (
    <div className={cn(
      "whitespace-pre-wrap break-words overflow-wrap-anywhere min-w-0",
      message.isStreaming && "streaming-message",
      className
    )}>
      {/* Simple markdown-like rendering */}
      {message.content.split('\n').map((line, index) => {
        // Handle headings
        if (line.startsWith('##')) {
          return (
            <h2 key={index} className="text-xl font-bold mt-4 mb-2 break-words">
              {line.replace(/^##\s*/, '')}
            </h2>
          );
        }
        if (line.startsWith('#')) {
          return (
            <h1 key={index} className="text-2xl font-bold mt-4 mb-2 break-words">
              {line.replace(/^#\s*/, '')}
            </h1>
          );
        }
        
        // Handle code blocks
        if (line.startsWith('```')) {
          return (
            <div key={index} className="bg-gray-100 dark:bg-gray-800 p-2 rounded font-mono text-sm my-2 break-words overflow-x-auto">
              {line.replace(/^```/, '')}
            </div>
          );
        }
        
        // Handle list items
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 list-disc break-words">
              {line.replace(/^-\s*/, '')}
            </li>
          );
        }
        
        // Regular paragraphs
        if (line.trim()) {
          return (
            <p key={index} className="mb-2 break-words">
              {line}
            </p>
          );
        }
        
        // Empty lines
        return <br key={index} />;
      })}
      
      {message.isStreaming && (
        <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1 streaming-cursor" />
      )}
    </div>
  );
};