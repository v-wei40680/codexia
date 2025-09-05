import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { CodexEvent, ApprovalRequest } from '@/types/codex';
// Local message shape derived from events; will be mapped to store messages
interface EventMessage {
  id: string;
  type: 'user' | 'agent' | 'system' | 'approval';
  content: string;
  title?: string;
  timestamp: Date;
  isStreaming?: boolean;
  approvalRequest?: ApprovalRequest;
  messageType?: 'reasoning' | 'tool_call' | 'plan_update' | 'exec_command' | 'normal';
  eventType?: string; // raw codex event msg.type
}
import { useConversationStore } from '../stores/ConversationStore';
import { StreamController, StreamControllerSink } from '@/utils/streamController';
import { generateUniqueId } from '@/utils/genUniqueId';

interface UseCodexEventsProps {
  sessionId: string;
  onStopStreaming?: () => void;
}

export const useCodexEvents = ({ 
  sessionId,
  onStopStreaming
}: UseCodexEventsProps) => {
  const { addMessage, updateMessage, setSessionLoading, createConversation, conversations } = useConversationStore();
  const streamController = useRef<StreamController>(new StreamController());
  const currentStreamingMessageId = useRef<string | null>(null);
  const currentCommandMessageId = useRef<string | null>(null);
  const currentCommandInfo = useRef<{ command: string[], cwd: string } | null>(null);

  const addMessageToStore = (message: EventMessage) => {
    // Ensure conversation exists
    const conversationExists = conversations.find(conv => conv.id === sessionId);
    if (!conversationExists) {
      console.log(`Creating conversation for session ${sessionId} from event`);
      createConversation('New Chat', 'agent', sessionId);
    }
    
    // Convert message format and add to store
    const conversationMessage = {
      id: message.id,
      role: message.type === 'user' ? 'user' as const : 
            message.type === 'agent' ? 'assistant' as const : 
            message.type === 'approval' ? 'approval' as const : 'system' as const,
      content: message.content,
      title: message.title,
      timestamp: message.timestamp.getTime(),
      // Preserve approval request data if present
      ...(message.approvalRequest && { approvalRequest: message.approvalRequest }),
      ...(message.messageType && { messageType: message.messageType }),
      ...(message.eventType && { eventType: message.eventType }),
    };
    
    addMessage(sessionId, conversationMessage);
  };

  // Create streaming sink for the controller
  const createStreamSink = useCallback((messageId: string): StreamControllerSink => {
    let accumulatedContent = '';
    
    return {
      insertLines: (lines: string[]) => {
        // Append new lines to accumulated content
        const newContent = lines.join('\n');
        if (accumulatedContent) {
          accumulatedContent += '\n' + newContent;
        } else {
          accumulatedContent = newContent;
        }
        updateMessage(sessionId, messageId, { content: accumulatedContent });
      },
      startAnimation: () => {
        // Animation started - could add visual indicators here
      },
      stopAnimation: () => {
        // Animation finished
      }
    };
  }, [sessionId, updateMessage]);

  const handleCodexEvent = (event: CodexEvent) => {
    // If event has session_id, route only matching session
    if (event.session_id) {
      const rawSessionId = sessionId.startsWith('codex-event-')
        ? sessionId.replace('codex-event-', '')
        : sessionId;

      if (event.session_id !== sessionId && event.session_id !== rawSessionId) {
        return; // Ignore events for other sessions
      }
    }
    const { msg } = event;
    
    switch (msg.type) {
      case 'session_configured':
        // Session is now configured and ready
        break;
        
      case 'task_started':
        setSessionLoading(sessionId, true);
        // Clear any previous streaming state
        streamController.current.clearAll();
        currentStreamingMessageId.current = null;
        break;
        
      case 'task_complete':
        setSessionLoading(sessionId, false);
        // Finalize any ongoing stream
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        break;
        
      case 'agent_message':
        // Handle complete message
        if (msg.message) {
          // Clean up any streaming state silently - complete message takes precedence
          if (currentStreamingMessageId.current) {
            streamController.current.finalize(false); // Don't commit partial content
            currentStreamingMessageId.current = null;
          }
          // dont add message because avoid dup message
        }
        break;
        
      case 'agent_reasoning':
      case 'agent_reasoning_raw_content':
        // Summarized reasoning message (TUI-like)
        {
          const reasoningContent = 'reasoning' in msg ? msg.reasoning : msg.content;
          if (reasoningContent) {
            const reasoningMessage: EventMessage = {
              id: `${sessionId}-reasoning-${generateUniqueId()}`,
              type: 'system',
              content: reasoningContent,
              timestamp: new Date(),
              messageType: 'reasoning',
              eventType: msg.type,
            };
            addMessageToStore(reasoningMessage);
          }
        }
        break;
        
      case 'agent_reasoning_delta':
      case 'agent_reasoning_raw_content_delta':
        // Do not render reasoning deltas into chat to reduce noise.
        break;
        
      case 'plan_update':
        // Handle plan updates
        const planSteps = msg.plan?.map(step => `- ${step.status === 'completed' ? '✅' : step.status === 'in_progress' ? '🔄' : '⏳'} ${step.step}`).join('\n') || '';
        
        const planMessage: EventMessage = {
          id: `${sessionId}-plan-${generateUniqueId()}`,
          type: 'system',
          title: `📋 ${msg.explanation || 'Plan Updated'}`,
          content: planSteps,
          timestamp: new Date(),
          messageType: 'plan_update',
          eventType: msg.type,
        };
        addMessageToStore(planMessage);
        break;
        
      case 'mcp_tool_call_begin':
        // Only show important tool calls like Read/Edit/Write, skip internal tools
        const toolName = msg.invocation?.tool || 'Unknown Tool';
        if (['read', 'edit', 'write', 'glob', 'grep'].some(t => toolName.toLowerCase().includes(t))) {
          const toolCallMessage: EventMessage = {
            id: `${sessionId}-mcp-${generateUniqueId()}`,
            type: 'system',
            title: `🔧 ${toolName}`,
            content: '',
            timestamp: new Date(),
            messageType: 'tool_call',
            eventType: msg.type,
          };
          addMessageToStore(toolCallMessage);
        }
        break;
        
      case 'mcp_tool_call_end':
        // Skip tool call end messages - they're too noisy
        break;
        
      case 'patch_apply_begin':
        // Skip patch begin - too noisy, turn_diff will show the changes
        break;
        
      case 'patch_apply_end':
        // Skip patch end - turn_diff shows what actually changed
        break;
        
      case 'web_search_begin':
        // Show web search activity
        const searchBeginMessage: EventMessage = {
          id: `${sessionId}-search-begin-${generateUniqueId()}`,
          type: 'system',
          title: `🔍 ${msg.query}`,
          content: 'Searching web...',
          timestamp: new Date(),
          eventType: msg.type,
        };
        addMessageToStore(searchBeginMessage);
        break;
        
      case 'web_search_end':
        // Skip search end - begin is enough
        break;
        
      case 'agent_message_delta':
        // Handle streaming delta
        if (!currentStreamingMessageId.current) {
          // Start new streaming message
          const messageId = `${sessionId}-stream-${generateUniqueId()}`;
          currentStreamingMessageId.current = messageId;
          
          const streamingMessage: EventMessage = {
            id: messageId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
            eventType: msg.type,
          };
          addMessageToStore(streamingMessage);
          
          // Begin streaming with sink
          const sink = createStreamSink(messageId);
          streamController.current.begin(sink);
        }
        
        // Push delta to stream controller
        if (currentStreamingMessageId.current && msg.delta) {
          streamController.current.pushAndMaybeCommit(msg.delta);
        }
        break;
        
      case 'exec_approval_request':
        // Add approval message to chat
        const execApprovalRequest: ApprovalRequest = {
          // Prefer call_id if present for approval round-trips
          id: (msg as any).call_id || event.id,
          type: 'exec',
          command: Array.isArray(msg.command) ? msg.command.join(' ') : msg.command,
          cwd: msg.cwd,
          call_id: (msg as any).call_id,
        };
        
        const execMessage: EventMessage = {
          id: event.id, // Use the original event ID, not a generated one
          type: 'approval',
          title: `🔧 Execute: ${execApprovalRequest.command}`,
          content: `Working directory: ${execApprovalRequest.cwd}`,
          timestamp: new Date(),
          approvalRequest: execApprovalRequest,
          eventType: msg.type,
        };
        addMessageToStore(execMessage);
        break;
        
      case 'patch_approval_request':
        // Add approval message to chat
        const patchApprovalRequest: ApprovalRequest = {
          id: event.id, // Use event.id for patch approvals
          type: 'patch',
          patch: msg.patch,
          files: msg.files,
        };
        
        const patchMessage: EventMessage = {
          id: event.id, // Use the original event ID, not a generated one
          type: 'approval',
          title: `📝 Patch: ${msg.files?.join(', ') || 'unknown files'}`,
          content: `Requesting approval to apply patch`,
          timestamp: new Date(),
          approvalRequest: patchApprovalRequest,
          eventType: msg.type,
        };
        addMessageToStore(patchMessage);
        break;
        
      case 'apply_patch_approval_request':
        // Add approval message to chat
        const applyPatchApprovalRequest: ApprovalRequest = {
          // Use call_id for apply_patch approvals so backend can match
          id: (msg as any).call_id || event.id,
          type: 'apply_patch',
          call_id: (msg as any).call_id,
          changes: (msg as any).changes,
        };
        
        // Create detailed content with changes info
        const changesText = msg.changes ? 
          Object.entries(msg.changes).map(([file, change]: [string, any]) => {
            if (change.add) {
              return `Add to ${file}:\n${change.add.content}`;
            } else if (change.remove) {
              return `Remove from ${file}:\n${change.remove.content}`;
            } else if (change.modify) {
              return `Modify ${file}:\n${change.modify.content}`;
            }
            return `Change ${file}`;
          }).join('\n\n') : 'No change details available';
        
        const applyPatchMessage: EventMessage = {
          id: event.id, // Use the original event ID, not a generated one
          type: 'approval',
          title: `🔄 Apply Patch Changes`,
          content: `Changes:\n${changesText}`,
          timestamp: new Date(),
          approvalRequest: applyPatchApprovalRequest,
          eventType: msg.type,
        };
        addMessageToStore(applyPatchMessage);
        break;
        
      case 'error':
        // Clean up any ongoing stream on error
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        
        const errorMessage: EventMessage = {
          id: `${sessionId}-error-${generateUniqueId()}`,
          type: 'system',
          content: `Error: ${msg.message}`,
          timestamp: new Date(),
          eventType: msg.type,
        };
        addMessageToStore(errorMessage);
        setSessionLoading(sessionId, false);
        break;
        
      case 'shutdown_complete':
        // Clean up streaming state on shutdown
        streamController.current.clearAll();
        currentStreamingMessageId.current = null;
        break;
        
      case 'background_event':
        // Background events are informational
        break;
        
      case 'turn_diff':
        // Show file changes made by AI
        // Extract file names from diff for title
        const fileMatches = msg.unified_diff.match(/\+\+\+\s+([^\s]+)/g);
        const fileNames = fileMatches ? fileMatches.map(m => m.replace(/\+\+\+\s+/, '')).join(', ') : 'files';
        
        const diffMessage: EventMessage = {
          id: `${sessionId}-diff-${generateUniqueId()}`,
          type: 'system',
          title: `✏️ Edit: ${fileNames}`,
          content: `\`\`\`diff\n${msg.unified_diff}\n\`\`\``,
          timestamp: new Date(),
          eventType: msg.type,
        };
        addMessageToStore(diffMessage);
        break;
        
      case 'exec_command_begin':
        // Create initial command message and store command info
        const cmdMessageId = `${sessionId}-cmd-${generateUniqueId()}`;
        const command = Array.isArray(msg.command) ? msg.command.join(' ') : msg.command;
        const cmdBeginMessage: EventMessage = {
          id: cmdMessageId,
          type: 'system',
          title: command,
          content: `⏳ Running...`,
          timestamp: new Date(),
          messageType: 'exec_command' as any,
          eventType: msg.type,
        };
        currentCommandMessageId.current = cmdMessageId;
        currentCommandInfo.current = { command: msg.command, cwd: msg.cwd };
        addMessageToStore(cmdBeginMessage);
        break;
        
      case 'exec_command_output_delta':
        // Command output streaming - message is chunk
        break;
        
      case 'exec_command_end':
        // Update the existing command message with completion info
        if (currentCommandMessageId.current && currentCommandInfo.current) {
          const command = currentCommandInfo.current.command.join(' ');
          
          const status = msg.exit_code === 0 ? '✅' : '❌';
          const statusText = msg.exit_code === 0 ? '' : ` (exit ${msg.exit_code})`;
          
          // For successful commands (exit code 0) with no output, just show success
          if (msg.exit_code === 0 && !msg.stdout?.trim() && !msg.stderr?.trim()) {
            updateMessage(sessionId, currentCommandMessageId.current, {
              title: `${status} ${command}`,
              content: '',
              timestamp: new Date().getTime(),
            });
          } else {
            // For commands with output or errors, show details
            const outputContent = `${msg.stdout?.trim() ? `Read:\n\`\`\`\n${msg.stdout}\`\`\`` : ''}${msg.stderr?.trim() ? `${msg.stdout?.trim() ? '\n\n' : ''}Errors:\n\`\`\`\n${msg.stderr}\`\`\`` : ''}`;
            
            updateMessage(sessionId, currentCommandMessageId.current, {
              title: `${status} ${command}${statusText}`,
              content: outputContent,
              timestamp: new Date().getTime(),
            });
          }
          
          currentCommandMessageId.current = null;
          currentCommandInfo.current = null;
        }
        break;

      case 'turn_aborted':
        // Handle turn abortion - add system message to indicate the turn was stopped
        const abortMessage: EventMessage = {
          id: `${sessionId}-aborted-${generateUniqueId()}`,
          type: 'system',
          title: '🛑 Turn Stopped',
          content: msg.reason ? `Reason: ${msg.reason}` : 'The current turn has been aborted.',
          timestamp: new Date(),
          eventType: msg.type,
        };
        addMessageToStore(abortMessage);
        
        // Clean up any ongoing streaming
        if (currentStreamingMessageId.current) {
          streamController.current.finalize();
          currentStreamingMessageId.current = null;
        }
        
        // Clean up any ongoing command execution tracking
        if (currentCommandMessageId.current) {
          currentCommandMessageId.current = null;
          currentCommandInfo.current = null;
        }
        
        // Signal that streaming should be stopped (handled by ChatInterface)
        if (onStopStreaming) {
          onStopStreaming();
        }
        break;
        
      default:
        console.log('Unhandled event type:', msg.type);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    // Listen to the global codex-events channel - process all events for approval to work
    const eventUnlisten = listen<CodexEvent>("codex-events", (event) => {
      const codexEvent = event.payload;
      
      // Log non-delta events for debugging
      if (codexEvent.msg.type !== "agent_message_delta") {
        console.log(`📨 Codex structured event [${sessionId}]:`, codexEvent.msg);
      }
      handleCodexEvent(codexEvent);
    });
    
    // Listen to raw events that failed structured parsing - process all events for approval to work
    const rawEventUnlisten = listen<{type: string, session_id: string, data: any}>("codex-raw-events", (event) => {
      const rawEvent = event.payload;
      
      console.log(`📨 Raw codex event [${sessionId}]:`, rawEvent.data);
      
      // Try to convert raw event to structured event
      if (rawEvent.data && typeof rawEvent.data === 'object') {
        const convertedEvent: CodexEvent = {
          id: rawEvent.data.id || `raw-${Date.now()}`,
          msg: rawEvent.data.msg || rawEvent.data,
          session_id: rawEvent.session_id
        };
        
        handleCodexEvent(convertedEvent);
      }
    });
    
    // Cleanup function
    return () => {
      eventUnlisten.then(fn => fn());
      rawEventUnlisten.then(fn => fn());
      // Clear streaming state when component unmounts or sessionId changes
      streamController.current.clearAll();
      currentStreamingMessageId.current = null;
    };
  }, [sessionId, createStreamSink]);

  return {};
};
