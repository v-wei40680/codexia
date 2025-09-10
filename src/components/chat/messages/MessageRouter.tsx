import React from 'react';
import { ApprovalMessage } from './ApprovalMessage';
import { ReasoningDisplay } from '../ReasoningDisplay';
import { AgentMessage } from './AgentMessage';
import { CommandExecutionMessage } from './CommandExecutionMessage';
import { ToolCallMessage } from './ToolCallMessage';
import { PlanUpdateMessage } from './PlanUpdateMessage';
import { SystemMessage } from './SystemMessage';
import { ErrorMessage } from './ErrorMessage';
import type { ChatMessage } from '@/types/chat';
import type { ApprovalRequest } from '@/types/codex';

interface MessageRouterProps {
  message: ChatMessage;
  selectedText?: string;
  onApproval?: (approved: boolean, approvalRequest: ApprovalRequest) => void;
}

export const MessageRouter: React.FC<MessageRouterProps> = ({ 
  message, 
  selectedText, 
  onApproval 
}) => {
  // Check for approval messages - use role and approvalRequest
  if (message.role === 'approval' && message.approvalRequest && onApproval) {
    return (
      <ApprovalMessage
        approvalRequest={message.approvalRequest}
        onApproval={(approved) => {
          onApproval?.(approved, message.approvalRequest!);
        }}
      />
    );
  }

  // Route based on message type
  switch (message.messageType) {
    case 'reasoning':
      return (
        <ReasoningDisplay 
          content={message.content}
          isStreaming={message.isStreaming}
        />
      );
      
    case 'tool_call':
      return <ToolCallMessage message={message} />;
      
    case 'plan_update':
      return <PlanUpdateMessage message={message} />;
      
    case 'exec_command':
      return <CommandExecutionMessage message={message} />;
      
    default:
      // Route based on role
      switch (message.role) {
        case 'system':
          return <SystemMessage message={message} />;
          
        case 'assistant':
          return <AgentMessage message={message} selectedText={selectedText} />;
          
        case 'user':
          return <AgentMessage message={message} selectedText={selectedText} />;
          
        default:
          // Check if this looks like an error
          if (message.content.toLowerCase().includes('error') || 
              message.content.toLowerCase().includes('failed')) {
            return <ErrorMessage message={message} />;
          }
          
          // Fallback to agent message
          return <AgentMessage message={message} selectedText={selectedText} />;
      }
  }
};
