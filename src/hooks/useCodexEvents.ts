import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ChatMessage, CodexEvent, ApprovalRequest } from '@/types/codex';
import { useConversationStore } from '../stores/ConversationStore';
import { StreamController, StreamControllerSink } from '@/utils/streamController';
import { generateUniqueId } from '@/utils/genUniqueId';

interface UseCodexEventsProps {
  sessionId: string;
}

// Helper function to extract session ID from codex events
const getEventSessionId = (event: CodexEvent): string | null => {
  const { msg } = event;
  switch (msg.type) {
    case 'session_configured':
      return msg.session_id;
    default:
      return null; // For other events, we can't determine session ID, so process them
  }
};

export const useCodexEvents = ({ 
  sessionId
}: UseCodexEventsProps) => {
  const { addMessage, updateMessage, setSessionLoading, createConversation, conversations } = useConversationStore();
  const streamController = useRef<StreamController>(new StreamController());
  const currentStreamingMessageId = useRef<string | null>(null);
  const currentCommandMessageId = useRef<string | null>(null);
  const currentCommandInfo = useRef<{ command: string[], cwd: string } | null>(null);

  const addMessageToStore = (message: ChatMessage) => {
    // Ensure conversation exists
    const conversationExists = conversations.find(conv => conv.id === sessionId);
    if (!conversationExists) {
      console.log(`Creating conversation for session ${sessionId} from event`);
      createConversation('New Chat', 'agent', sessionId);
    }
    
    // Convert message format and add to store
    const conversationMessage = {
      id: message.id,
      role: message.type === 'user' ? 'user' as const : message.type === 'agent' ? 'assistant' as const : 'system' as const,
      content: message.content,
      timestamp: message.timestamp.getTime(),
      // Preserve approval request data if present
      ...(message.approvalRequest && { approvalRequest: message.approvalRequest }),
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
    const { msg } = event;
    
    // Debug: log current streaming state for important events
    if (['task_started', 'agent_message', 'agent_message_delta', 'task_complete'].includes(msg.type)) {
      console.log(`🔍 Event ${msg.type}, streaming state:`, currentStreamingMessageId.current);
    }
    
    switch (msg.type) {
      case 'session_configured':
        // Session is now configured and ready
        break;
        
      case 'task_started':
        setSessionLoading(sessionId, true);
        // Clear any previous streaming state
        if (currentStreamingMessageId.current) {
          console.log('🧹 Clearing previous streaming state on task_started:', currentStreamingMessageId.current);
        }
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
            console.log('🔄 Replacing streaming message with complete message');
            streamController.current.finalize(false); // Don't commit partial content
            currentStreamingMessageId.current = null;
          }
          
          console.log('💬 Processing complete agent_message');
          // dont add message becaude avoid dup message
        }
        break;
        
      case 'agent_message_delta':
        // Handle streaming delta
        if (!currentStreamingMessageId.current) {
          // Start new streaming message
          console.log('🚀 Starting new streaming message');
          const messageId = `${sessionId}-stream-${generateUniqueId()}`;
          currentStreamingMessageId.current = messageId;
          
          const streamingMessage: ChatMessage = {
            id: messageId,
            type: 'agent',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
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
          id: msg.call_id, // Use call_id for exec approvals
          type: 'exec',
          command: Array.isArray(msg.command) ? msg.command.join(' ') : msg.command,
          cwd: msg.cwd,
          call_id: msg.call_id,
        };
        
        const execMessage: ChatMessage = {
          id: event.id, // Use the original event ID, not a generated one
          type: 'approval',
          content: `🔧 Requesting approval to execute: \`${execApprovalRequest.command}\`\n\nWorking directory: ${execApprovalRequest.cwd}`,
          timestamp: new Date(),
          approvalRequest: execApprovalRequest,
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
        
        const patchMessage: ChatMessage = {
          id: event.id, // Use the original event ID, not a generated one
          type: 'approval',
          content: `📝 Requesting approval to apply patch to files: ${msg.files?.join(', ') || 'unknown files'}`,
          timestamp: new Date(),
          approvalRequest: patchApprovalRequest,
        };
        addMessageToStore(patchMessage);
        break;
        
      case 'apply_patch_approval_request':
        // Add approval message to chat
        const applyPatchApprovalRequest: ApprovalRequest = {
          id: event.id, // CRITICAL: Use event.id for patch approvals, NOT call_id
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
        
        const applyPatchMessage: ChatMessage = {
          id: event.id, // Use the original event ID, not a generated one
          type: 'approval',
          content: `🔄 Requesting approval to apply patch changes\n\nChanges:\n${changesText}`,
          timestamp: new Date(),
          approvalRequest: applyPatchApprovalRequest,
        };
        addMessageToStore(applyPatchMessage);
        break;
        
      case 'error':
        // Clean up any ongoing stream on error
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        
        const errorMessage: ChatMessage = {
          id: `${sessionId}-error-${generateUniqueId()}`,
          type: 'system',
          content: `Error: ${msg.message}`,
          timestamp: new Date(),
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
        // Add diff message to chat
        const diffMessage: ChatMessage = {
          id: `${sessionId}-diff-${generateUniqueId()}`,
          type: 'system',
          content: `📝 Code changes:\n\`\`\`diff\n${msg.unified_diff}\n\`\`\``,
          timestamp: new Date(),
        };
        addMessageToStore(diffMessage);
        break;
        
      case 'exec_command_begin':
        // Create initial command message and store command info
        const cmdMessageId = `${sessionId}-cmd-${generateUniqueId()}`;
        const command = Array.isArray(msg.command) ? msg.command.join(' ') : msg.command;
        const cmdBeginMessage: ChatMessage = {
          id: cmdMessageId,
          type: 'system',
          content: `▶️ Executing: \`${command}\``,
          timestamp: new Date(),
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
          const completedContent = `▶️ Executing: \`${command}\`\n\n✅ Command completed with exit code: ${msg.exit_code}${msg.stdout ? `\n\nOutput:\n\`\`\`\n${msg.stdout}\`\`\`` : ''}${msg.stderr ? `\n\nErrors:\n\`\`\`\n${msg.stderr}\`\`\`` : ''}`;
          
          updateMessage(sessionId, currentCommandMessageId.current, {
            content: completedContent,
            timestamp: new Date().getTime(),
          });
          
          currentCommandMessageId.current = null;
          currentCommandInfo.current = null;
        }
        break;
        
      default:
        console.log('Unhandled event type:', msg.type);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    // Listen to the global codex-events channel
    const eventUnlisten = listen<CodexEvent>("codex-events", (event) => {
      const codexEvent = event.payload;
      
      // Check if this event is for our session
      const eventSessionId = getEventSessionId(codexEvent);
      const ourSessionId = sessionId.replace('codex-event-', '');
      
      if (eventSessionId && eventSessionId !== ourSessionId) {
        // This event is for a different session, ignore it
        return;
      }
      
      // Log non-delta events for debugging
      if (codexEvent.msg.type !== "agent_message_delta") {
        console.log(`📨 Codex event [${sessionId}]:`, codexEvent.msg.type);
      }
      handleCodexEvent(codexEvent);
    });
    
    // Cleanup function
    return () => {
      eventUnlisten.then(fn => fn());
      // Clear streaming state when component unmounts or sessionId changes
      streamController.current.clearAll();
      currentStreamingMessageId.current = null;
    };
  }, [sessionId, createStreamSink]);

  return {};
};