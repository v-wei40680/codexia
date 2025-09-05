import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { ChatMessage } from '@/types/chat';

interface SystemMessageProps {
  message: ChatMessage;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ message }) => {
  return <MarkdownRenderer content={message.content} />;
};