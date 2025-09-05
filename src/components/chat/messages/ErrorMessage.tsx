import React from 'react';
import { AlertCircle } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { ChatMessage } from '@/types/chat';

interface ErrorMessageProps {
  message: ChatMessage;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-red-900 dark:text-red-100">
            <MarkdownRenderer content={message.content} />
          </div>
        </div>
      </div>
    </div>
  );
};