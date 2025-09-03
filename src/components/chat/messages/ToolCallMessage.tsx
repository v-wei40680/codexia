import React from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { ToolExecutionIndicator } from '../ToolExecutionIndicator';
import type { NormalizedMessage } from '../Message';

interface ToolCallMessageProps {
  message: NormalizedMessage;
}

export const ToolCallMessage: React.FC<ToolCallMessageProps> = ({ message }) => {
  return (
    <div className="space-y-3">
      {/* Tool execution indicator */}
      {message.toolInfo && (
        <div className="mb-3">
          <ToolExecutionIndicator
            toolName={message.toolInfo.name}
            status={message.toolInfo.status}
            duration={message.toolInfo.duration}
          />
        </div>
      )}
      
      {/* Tool call content */}
      <MarkdownRenderer content={message.content} />
    </div>
  );
};