import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { NormalizedMessage } from '../Message';

interface SystemMessageProps {
  message: NormalizedMessage;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({ message }) => {
  return <MarkdownRenderer content={message.content} />;
};