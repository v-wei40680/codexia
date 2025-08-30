import { useEffect, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ChatMessage, CodexEvent, ApprovalRequest } from '@/types/codex';
import { useConversationStore } from '../stores/ConversationStore';
import { StreamController, StreamControllerSink } from '@/utils/streamController';

interface UseCodexEventsProps {
  sessionId: string;
  onApprovalRequest: (request: ApprovalRequest) => void;
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
  sessionId, 
  onApprovalRequest
}: UseCodexEventsProps) => {
  const { addMessage, updateMessage, setSessionLoading, createConversation, conversations } = useConversationStore();
  const streamController = useRef<StreamController>(new StreamController());
  const currentStreamingMessageId = useRef<string | null>(null);

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
    };
    console.log(`Adding message to session ${sessionId}:`, conversationMessage.content.substring(0, 100));
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
    
    switch (msg.type) {
      case 'session_configured':
        console.log('Session configured:', msg.session_id);
        // Session is now configured and ready
        break;
        
      case 'task_started':
        setSessionLoading(sessionId, true);
        // Clear any previous streaming state
        streamController.current.clearAll();
        currentStreamingMessageId.current = null;
        break;
        
      case 'task_complete':
        console.log('🔄 Task complete event received, setting loading to false');
        setSessionLoading(sessionId, false);
        // Finalize any ongoing stream
        if (currentStreamingMessageId.current) {
          streamController.current.finalize(true);
          currentStreamingMessageId.current = null;
        }
        break;
        
      case 'agent_message':
        // Handle complete message (fallback for non-streaming)
        if (msg.message && !currentStreamingMessageId.current) {
          const agentMessage: ChatMessage = {
            id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type: 'agent',
            content: msg.message,
            timestamp: new Date(),
          };
          addMessageToStore(agentMessage);
        }
        break;
        
      case 'agent_message_delta':
        // Handle streaming delta
        if (!currentStreamingMessageId.current) {
          // Start new streaming message
          const messageId = `${sessionId}-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
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
        // Add chat message for exec request
        const execMessage: ChatMessage = {
          id: `${sessionId}-exec-request-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `🔧 Requesting approval to execute: \`${Array.isArray(msg.command) ? msg.command.join(' ') : msg.command}\`\n\nWorking directory: ${msg.cwd}`,
          timestamp: new Date(),
        };
        addMessageToStore(execMessage);
        
        onApprovalRequest({
          id: event.id,
          type: 'exec',
          command: Array.isArray(msg.command) ? msg.command.join(' ') : msg.command,
          cwd: msg.cwd,
          call_id: msg.call_id,
        });
        break;
        
      case 'patch_approval_request':
        // Add chat message for patch request
        const patchMessage: ChatMessage = {
          id: `${sessionId}-patch-request-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `📝 Requesting approval to apply patch to files: ${msg.files?.join(', ') || 'unknown files'}`,
          timestamp: new Date(),
        };
        addMessageToStore(patchMessage);
        
        onApprovalRequest({
          id: event.id,
          type: 'patch',
          patch: msg.patch,
          files: msg.files,
        });
        break;
        
      case 'apply_patch_approval_request':
        // Add chat message for apply patch request
        const applyPatchMessage: ChatMessage = {
          id: `${sessionId}-apply-patch-request-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `🔄 Requesting approval to apply patch changes`,
          timestamp: new Date(),
        };
        addMessageToStore(applyPatchMessage);
        
        onApprovalRequest({
          id: event.id,
          type: 'apply_patch',
          call_id: (msg as any).call_id,
          changes: (msg as any).changes,
        });
        break;
        
      case 'error':
        const errorMessage: ChatMessage = {
          id: `${sessionId}-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `Error: ${msg.message}`,
          timestamp: new Date(),
        };
        addMessageToStore(errorMessage);
        setSessionLoading(sessionId, false);
        break;
        
      case 'shutdown_complete':
        console.log('Session shutdown completed');
        // Clean up streaming state on shutdown
        streamController.current.clearAll();
        currentStreamingMessageId.current = null;
        break;
        
      case 'background_event':
        console.log('Background event:', msg.message);
        break;
        
      case 'turn_diff':
        console.log('Turn diff received, length:', (msg as any).unified_diff?.length || 0);
        // Could emit this for diff viewer components if needed
        break;
        
      case 'exec_command_begin':
        console.log('Command execution started');
        // Add chat message for command begin
        const cmdBeginMessage: ChatMessage = {
          id: `${sessionId}-cmd-begin-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `▶️ Executing: \`${Array.isArray(msg.command) ? msg.command.join(' ') : msg.command}\``,
          timestamp: new Date(),
        };
        addMessageToStore(cmdBeginMessage);
        break;
        
      case 'exec_command_output_delta':
        console.log('Command output:', (msg as any).stream || '');
        break;
        
      case 'exec_command_end':
        console.log('Command execution completed');
        // Add chat message for command completion
        const cmdEndMessage: ChatMessage = {
          id: `${sessionId}-cmd-end-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `✅ Command completed with exit code: ${msg.exit_code}${msg.stdout ? `\n\nOutput:\n\`\`\`\n${msg.stdout}\`\`\`` : ''}${msg.stderr ? `\n\nErrors:\n\`\`\`\n${msg.stderr}\`\`\`` : ''}`,
          timestamp: new Date(),
        };
        addMessageToStore(cmdEndMessage);
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
      
      // if (codexEvent.msg.type !== "agent_message_delta") {
        console.log(`Received codex event for session ${sessionId}:`, codexEvent);
      // }
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