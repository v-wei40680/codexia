import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MessageFooter } from './MessageFooter';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StreamingMessage } from './StreamingMessage';
import { ApprovalMessage } from './ApprovalMessage';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ApprovalRequest } from '@/types/codex';

interface NormalizedMessage {
  id: string;
  role: string;
  content: string;
  timestamp: number;
  isStreaming: boolean;
  model?: string;
  approvalRequest?: ApprovalRequest;
}

interface MessageProps {
  message: NormalizedMessage;
  index: number;
  isLastMessage: boolean;
  selectedText: string;
  previousMessage?: NormalizedMessage;
  nextMessage?: NormalizedMessage;
  onApproval?: (approved: boolean, approvalRequest: ApprovalRequest) => void;
}


const getMessageStyle = (role: string) => {
  switch (role) {
    case 'user':
      return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-900 dark:text-primary-100 shadow-sm';
    case 'assistant':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-sm'; 
    case 'system':
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm';
    case 'approval':
      return 'bg-transparent'; // ApprovalMessage has its own styling
    default:
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm';
  }
};

export const Message = memo<MessageProps>(({ 
  message: normalized, 
  index, 
  isLastMessage, 
  selectedText,
  nextMessage,
  onApproval
}) => {
  
  const isEnvironmentContext = normalized.content.startsWith('<environment_context>');
  
  // Detect message types that should be collapsible
  const isSystemMessage = normalized.role === 'system';
  const isExecutionMessage = normalized.content.includes('▶️ Executing:') || normalized.content.includes('✅ Command completed');
  const isApprovalRequest = normalized.content.includes('🔧 Requesting approval') || 
                           normalized.content.includes('📝 Requesting approval') || 
                           normalized.content.includes('🔄 Requesting approval');
  const isCodeContent = normalized.content.includes('```') && normalized.content.length > 200;
  const hasLongOutput = normalized.content.length > 500; // Long content
  
  // Determine if this message should be collapsible and initially collapsed
  const shouldBeCollapsible = isEnvironmentContext || 
                              (isSystemMessage && (isExecutionMessage || isApprovalRequest || (isCodeContent && hasLongOutput)));
  const [isCollapsed, setIsCollapsed] = useState(shouldBeCollapsible);
  
  // Check if this message is part of a continuous assistant conversation
  const isCurrentAssistant = normalized.role === 'assistant';
  const isNextAssistant = nextMessage?.role === 'assistant';
  const showBottomConnector = isCurrentAssistant && isNextAssistant;
  
  const getWorkingDirectory = () => {
    if (!isEnvironmentContext) return '';
    const match = normalized.content.match(/Current working directory: ([^\n\r]+)/);
    return match ? match[1] : '';
  };
  
  // Extract clean output content for command execution messages
  const getCleanExecutionContent = () => {
    if (!isExecutionMessage) return normalized.content;
    
    if (normalized.content.includes('✅ Command completed')) {
      // Extract only the output and error parts
      let cleanContent = '';
      
      const outputMatch = normalized.content.match(/Output:\n```\n([\s\S]*?)\n```/);
      const errorMatch = normalized.content.match(/Errors:\n```\n([\s\S]*?)\n```/);
      
      if (outputMatch) {
        cleanContent += `**Output:**\n\`\`\`\n${outputMatch[1]}\n\`\`\``;
      }
      
      if (errorMatch) {
        if (cleanContent) cleanContent += '\n\n';
        cleanContent += `**Errors:**\n\`\`\`\n${errorMatch[1]}\n\`\`\``;
      }
      
      // If no output or errors found, show a simple completion message
      if (!cleanContent) {
        const exitMatch = normalized.content.match(/exit code: (\d+)/);
        cleanContent = exitMatch ? `Command completed with exit code: ${exitMatch[1]}` : 'Command completed successfully';
      }
      
      return cleanContent;
    }
    
    return normalized.content;
  };
  
  // Get preview text for collapsed messages
  const getPreviewText = () => {
    if (isEnvironmentContext) return 'Environment Context';
    if (isExecutionMessage) {
      if (normalized.content.includes('▶️ Executing:')) {
        const match = normalized.content.match(/▶️ Executing: `(.+?)`/);
        return match ? match[1] : 'Command Execution';
      }
      if (normalized.content.includes('✅ Command completed')) {
        // Try to extract the original command from the execution message
        // Look for the command in the format we know it's stored
        const commandMatch = normalized.content.match(/▶️ Executing: `(.+?)`/);
        const exitMatch = normalized.content.match(/exit code: (\d+)/);
        if (commandMatch) {
          return `${commandMatch[1]} ${exitMatch ? `(exit ${exitMatch[1]})` : ''}`;
        }
        return exitMatch ? `Command completed (exit ${exitMatch[1]})` : 'Command Completed';
      }
    }
    if (isApprovalRequest) {
      if (normalized.content.includes('🔧 Requesting approval to execute:')) {
        const match = normalized.content.match(/🔧 Requesting approval to execute: `(.+?)`/);
        return match ? `🔧 Execute: ${match[1]}` : '🔧 Execution Approval';
      }
      if (normalized.content.includes('📝 Requesting approval to apply patch')) {
        const match = normalized.content.match(/files: (.+?)$/m);
        return match ? `📝 Patch: ${match[1]}` : '📝 Patch Approval';
      }
      if (normalized.content.includes('🔄 Requesting approval to apply patch changes')) {
        return '🔄 Apply Patch Changes';
      }
      return 'Approval Request';
    }
    if (isCodeContent && hasLongOutput) return '📄 Code Content';
    return normalized.content.substring(0, 100) + (normalized.content.length > 100 ? '...' : '');
  };


  return (
    <div
      key={`${normalized.id}-${index}`}
      className={`group min-w-0 relative flex items-start gap-1 transition-opacity duration-300 ease-in-out ${isLastMessage ? 'mb-6' : 'mb-3'}`}
      data-message-role={normalized.role}
      data-message-timestamp={normalized.timestamp}
    >
      {normalized.role !== 'user' && (
        <div className="flex flex-col items-center min-w-0 pt-2 relative">
          {/* Timeline dot */}
          <div className={`w-4 h-4 rounded-full border-2 bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 shadow-md z-10 ${
            normalized.role === 'user' ? 'border-primary-400 dark:border-primary-500 bg-primary-100 dark:bg-primary-900/50' :
            normalized.role === 'assistant' ? 'border-blue-400 dark:border-blue-500 bg-blue-100 dark:bg-blue-900/50' : 'border-gray-400 dark:border-gray-500 bg-gray-200 dark:bg-gray-700'
          }`} />
          
          {/* Timeline line - extends to next message */}
          {!isLastMessage && (
            <div className={`absolute top-6 left-1/2 transform -translate-x-1/2 w-1 ${
              showBottomConnector ? 'bg-gradient-to-b from-blue-300 to-blue-100 dark:from-blue-600 dark:to-blue-800 shadow-inner' : 'bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700'
            }`} 
                 style={{ height: 'calc(100% + 0.75rem)' }} />
          )}
        </div>
      )}

      {normalized.content.length !== 0 && 
        <div className="flex-1 min-w-0 relative">
          {/* Handle approval messages separately */}
          {(() => {
            // Check for different types of approval messages
            const isExecApproval = normalized.content.includes('🔧 Requesting approval to execute:');
            const isPatchApproval = normalized.content.includes('📝 Requesting approval to apply patch');
            const isApplyPatchApproval = normalized.content.includes('🔄 Requesting approval to apply patch changes');
            
            const isApprovalMessage = isExecApproval || isPatchApproval || isApplyPatchApproval;
            
            if (isApprovalMessage && onApproval) {
              // Parse different approval types
              if (isExecApproval) {
                const commandMatch = normalized.content.match(/🔧 Requesting approval to execute: `(.+?)`/);
                const workingDirMatch = normalized.content.match(/Working directory: (.+?)$/m);
                
                return {
                  type: 'exec' as const,
                  command: commandMatch ? commandMatch[1] : 'Unknown command',
                  cwd: workingDirMatch ? workingDirMatch[1] : '/'
                };
              } else if (isPatchApproval) {
                const filesMatch = normalized.content.match(/files: (.+?)$/m);
                
                return {
                  type: 'patch' as const,
                  files: filesMatch ? filesMatch[1].split(', ') : ['unknown files']
                };
              } else if (isApplyPatchApproval) {
                return {
                  type: 'apply_patch' as const
                };
              }
            }
            return null;
          })() ? (
            <ApprovalMessage
              approvalRequest={(() => {
                const isExecApproval = normalized.content.includes('🔧 Requesting approval to execute:');
                const isPatchApproval = normalized.content.includes('📝 Requesting approval to apply patch');
                const isApplyPatchApproval = normalized.content.includes('🔄 Requesting approval to apply patch changes');
                
                if (isExecApproval) {
                  const commandMatch = normalized.content.match(/🔧 Requesting approval to execute: `(.+?)`/);
                  const workingDirMatch = normalized.content.match(/Working directory: (.+?)$/m);
                  
                  return {
                    id: normalized.approvalRequest?.call_id || normalized.approvalRequest?.id || normalized.id,
                    type: 'exec' as const,
                    command: commandMatch ? commandMatch[1] : 'Unknown command',
                    cwd: workingDirMatch ? workingDirMatch[1] : '/'
                  };
                } else if (isPatchApproval) {
                  const filesMatch = normalized.content.match(/files: (.+?)$/m);
                  
                  return {
                    id: normalized.id,
                    type: 'patch' as const,
                    files: filesMatch ? filesMatch[1].split(', ') : ['unknown files']
                  };
                } else if (isApplyPatchApproval) {
                  // Extract changes from content
                  const changesMatch = normalized.content.match(/Changes:\n([\s\S]+)$/);
                  const changesText = changesMatch ? changesMatch[1] : null;
                  
                  return {
                    id: normalized.approvalRequest?.id || normalized.id,
                    type: 'apply_patch' as const,
                    changes: normalized.approvalRequest?.changes || changesText
                  };
                }
                
                // Fallback
                return {
                  id: normalized.id,
                  type: 'exec' as const,
                  command: 'Unknown command',
                  cwd: '/'
                };
              })()
              }
              onApproval={(approved) => {
                const isExecApproval = normalized.content.includes('🔧 Requesting approval to execute:');
                const isPatchApproval = normalized.content.includes('📝 Requesting approval to apply patch');
                const isApplyPatchApproval = normalized.content.includes('🔄 Requesting approval to apply patch changes');
                
                let approvalRequest;
                
                if (isExecApproval) {
                  const commandMatch = normalized.content.match(/🔧 Requesting approval to execute: `(.+?)`/);
                  const workingDirMatch = normalized.content.match(/Working directory: (.+?)$/m);
                  
                  approvalRequest = {
                    id: normalized.approvalRequest?.call_id || normalized.approvalRequest?.id || normalized.id,
                    type: 'exec' as const,
                    command: commandMatch ? commandMatch[1] : 'Unknown command',
                    cwd: workingDirMatch ? workingDirMatch[1] : '/'
                  };
                } else if (isPatchApproval) {
                  const filesMatch = normalized.content.match(/files: (.+?)$/m);
                  
                  approvalRequest = {
                    id: normalized.id,
                    type: 'patch' as const,
                    files: filesMatch ? filesMatch[1].split(', ') : ['unknown files']
                  };
                } else if (isApplyPatchApproval) {
                  // Extract changes from content
                  const changesMatch = normalized.content.match(/Changes:\n([\s\S]+)$/);
                  const changesText = changesMatch ? changesMatch[1] : null;
                  
                  approvalRequest = {
                    id: normalized.approvalRequest?.id || normalized.id,
                    type: 'apply_patch' as const,
                    changes: normalized.approvalRequest?.changes || changesText
                  };
                } else {
                  // Fallback
                  approvalRequest = {
                    id: normalized.id,
                    type: 'exec' as const,
                    command: 'Unknown command',
                    cwd: '/'
                  };
                }
                
                onApproval?.(approved, approvalRequest);
              }}
            />
          ) : (
            <>
              {/* Content */}
              <div className={`relative w-full min-w-0 max-w-full ${getMessageStyle(normalized.role)} rounded-lg px-2 py-1`}>
                <div className="break-words overflow-wrap-anywhere min-w-0 max-w-full overflow-hidden prose prose-sm prose-slate dark:prose-invert transition-all duration-300 ease-in-out">
                  {shouldBeCollapsible ? (
                    <Collapsible open={!isCollapsed} onOpenChange={(open) => setIsCollapsed(!open)}>
                      <CollapsibleTrigger asChild>
                        <div className={`flex items-center gap-2 w-full text-left rounded-md py- cursor-pointer select-none transition-colors duration-200 ease-in-out hover:bg-accent/20 dark:hover:bg-accent/10`}>
                          <span className={`transform transition-transform duration-300 ease-in-out ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}>
                            {isCollapsed ? <ChevronRight className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                          </span>
                          <span className="text-sm text-muted-foreground font-mono select-text">
                            {getPreviewText()}
                          </span>
                          {isEnvironmentContext && getWorkingDirectory() && (
                            <span className="text-xs text-muted-foreground/70 dark:text-muted-foreground/60 ml-2 select-text">
                              {getWorkingDirectory()}
                            </span>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-3 overflow-hidden transition-all duration-300 ease-in-out">
                        {normalized.isStreaming ? (
                          <StreamingMessage 
                            message={{
                              id: normalized.id,
                              role: normalized.role as "user" | "assistant" | "system",
                              content: getCleanExecutionContent(),
                              timestamp: normalized.timestamp,
                              isStreaming: normalized.isStreaming
                            }}
                          />
                        ) : (
                          <MarkdownRenderer content={getCleanExecutionContent()} />
                        )}
                        
                        <MessageFooter
                          messageId={normalized.id}
                          messageContent={normalized.content}
                          messageRole={normalized.role}
                          timestamp={normalized.timestamp}
                          selectedText={selectedText}
                        />
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <>
                      {normalized.isStreaming ? (
                        <StreamingMessage 
                          message={{
                            id: normalized.id,
                            role: normalized.role as "user" | "assistant" | "system",
                            content: normalized.content,
                            timestamp: normalized.timestamp,
                            isStreaming: normalized.isStreaming
                          }}
                        />
                      ) : (
                        <MarkdownRenderer content={normalized.content} />
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {/* MessageFooter outside content container when not collapsed */}
              {!shouldBeCollapsible && (
                <MessageFooter
                  messageId={normalized.id}
                  messageContent={normalized.content}
                  messageRole={normalized.role}
                  timestamp={normalized.timestamp}
                  selectedText={selectedText}
                />
              )}
            </>
          )}
        </div>
      }
    </div>
  );
});