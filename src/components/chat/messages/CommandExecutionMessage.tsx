import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { VirtualizedTextRenderer } from '../VirtualizedTextRenderer';
import type { NormalizedMessage } from '@/types/chat';

interface CommandExecutionMessageProps {
  message: NormalizedMessage;
}

export const CommandExecutionMessage: React.FC<CommandExecutionMessageProps> = ({ message }) => {
  const getCleanExecutionContent = () => {
    if (message.content.includes('✅ Command completed')) {
      // Extract only the output and error parts
      let cleanContent = '';
      
      const outputMatch = message.content.match(/Read:\n```\n([\s\S]*?)\n```/);
      const errorMatch = message.content.match(/Errors:\n```\n([\s\S]*?)\n```/);
      
      if (outputMatch) {
        cleanContent += `**Read:**\n\`\`\`\n${outputMatch[1]}\n\`\`\``;
      }
      
      if (errorMatch) {
        if (cleanContent) cleanContent += '\n\n';
        cleanContent += `**Errors:**\n\`\`\`\n${errorMatch[1]}\n\`\`\``;
      }
      
      // If no output or errors found, show a simple completion message
      if (!cleanContent) {
        const exitMatch = message.content.match(/exit code: (\d+)/);
        cleanContent = exitMatch ? `Command completed with exit code: ${exitMatch[1]}` : 'Command completed successfully';
      }
      
      return cleanContent;
    }
    
    return message.content;
  };

  const shouldUseVirtualizedRenderer = () => {
    const contentToRender = getCleanExecutionContent();
    const lineCount = contentToRender.split('\n').length;
    const charCount = contentToRender.length;
    
    return lineCount > 100 || charCount > 10000
  };

  const content = getCleanExecutionContent();

  if (shouldUseVirtualizedRenderer()) {
    return <VirtualizedTextRenderer content={content} />;
  }

  return <MarkdownRenderer content={content} />;
};