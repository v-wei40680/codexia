import { memo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MessageFooter } from './MessageFooter';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StreamingMessage } from './StreamingMessage';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NormalizedMessage {
  id: string;
  role: string;
  content: string;
  timestamp: number;
  isStreaming: boolean;
  model?: string;
}

interface MessageProps {
  message: NormalizedMessage;
  index: number;
  isLastMessage: boolean;
  selectedText: string;
  previousMessage?: NormalizedMessage;
  nextMessage?: NormalizedMessage;
}


const getMessageStyle = (role: string) => {
  switch (role) {
    case 'user':
      return 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700 text-primary-900 dark:text-primary-100 shadow-sm';
    case 'assistant':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-100 shadow-sm'; 
    case 'system':
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm';
    default:
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 shadow-sm';
  }
};

export const Message = memo<MessageProps>(({ 
  message: normalized, 
  index, 
  isLastMessage, 
  selectedText,
  nextMessage
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
  
  // Get preview text for collapsed messages
  const getPreviewText = () => {
    if (isEnvironmentContext) return 'Environment Context';
    if (isExecutionMessage) {
      if (normalized.content.includes('▶️ Executing:')) {
        const match = normalized.content.match(/▶️ Executing: `(.+?)`/);
        return match ? `▶️ ${match[1]}` : '▶️ Command Execution';
      }
      if (normalized.content.includes('✅ Command completed')) {
        const match = normalized.content.match(/exit code: (\d+)/);
        return match ? `✅ Command completed (exit ${match[1]})` : '✅ Command Completed';
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
                          content: normalized.content,
                          timestamp: normalized.timestamp,
                          isStreaming: normalized.isStreaming
                        }}
                      />
                    ) : (
                      <MarkdownRenderer content={normalized.content} />
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
        </div>
      }
    </div>
  );
});