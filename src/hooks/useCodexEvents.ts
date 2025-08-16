import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ChatMessage, CodexEvent, ApprovalRequest } from '@/types/codex';
import { useChatStore } from '../stores/chatStore';

interface UseCodexEventsProps {
  sessionId: string;
  onApprovalRequest: (request: ApprovalRequest) => void;
  onStreamingMessage: (message: ChatMessage | null) => void;
}

export const useCodexEvents = ({ 
  sessionId, 
  onApprovalRequest, 
  onStreamingMessage 
}: UseCodexEventsProps) => {
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
  const { addMessage, setSessionLoading } = useChatStore();

  const handleCodexEvent = (event: CodexEvent) => {
    const { msg } = event;
    
    switch (msg.type) {
      case 'session_configured':
        console.log('Session configured:', msg.session_id);
        break;
        
      case 'task_started':
        setSessionLoading(sessionId, true);
        break;
        
      case 'task_complete':
        setSessionLoading(sessionId, false);
        if (streamingMessage) {
          const finalMessage = { ...streamingMessage, isStreaming: false };
          addMessage(sessionId, finalMessage);
          setStreamingMessage(null);
          onStreamingMessage(null);
        }
        break;
        
      case 'agent_message':
        if (msg.message) {
          const agentMessage: ChatMessage = {
            id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type: 'agent',
            content: msg.message,
            timestamp: new Date(),
          };
          addMessage(sessionId, agentMessage);
        }
        break;
        
      case 'agent_message_delta':
        if (streamingMessage) {
          const updatedMessage = {
            ...streamingMessage,
            content: streamingMessage.content + msg.delta,
          };
          setStreamingMessage(updatedMessage);
          onStreamingMessage(updatedMessage);
        } else {
          const newMessage: ChatMessage = {
            id: `${sessionId}-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type: 'agent',
            content: msg.delta,
            timestamp: new Date(),
            isStreaming: true,
          };
          setStreamingMessage(newMessage);
          onStreamingMessage(newMessage);
        }
        break;
        
      case 'exec_approval_request':
        onApprovalRequest({
          id: event.id,
          type: 'exec',
          command: msg.command,
          cwd: msg.cwd,
        });
        break;
        
      case 'patch_approval_request':
        onApprovalRequest({
          id: event.id,
          type: 'patch',
          patch: msg.patch,
          files: msg.files,
        });
        break;
        
      case 'error':
        const errorMessage: ChatMessage = {
          id: `${sessionId}-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `Error: ${msg.message}`,
          timestamp: new Date(),
        };
        addMessage(sessionId, errorMessage);
        setSessionLoading(sessionId, false);
        break;
        
      case 'shutdown_complete':
        console.log('Session shutdown completed');
        break;
        
      case 'background_event':
        console.log('Background event:', msg.message);
        break;
        
      default:
        console.log('Unhandled event type:', msg.type);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const eventUnlisten = listen<CodexEvent>(`codex-event-${sessionId}`, (event) => {
      const codexEvent = event.payload;
      console.log('Received codex event:', codexEvent);
      handleCodexEvent(codexEvent);
    });
    
    const responseUnlisten = listen<string>(`codex-response:${sessionId}`, (event) => {
      const response = event.payload;
      console.log('Received codex response:', response);
      
      const agentMessage: ChatMessage = {
        id: `${sessionId}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'agent',
        content: response,
        timestamp: new Date(),
      };
      addMessage(sessionId, agentMessage);
      setSessionLoading(sessionId, false);
    });
    
    const errorUnlisten = listen<string>(`codex-error:${sessionId}`, (event) => {
      let errorLine = event.payload;
      console.log('Received codex error:', errorLine);
      
      errorLine = errorLine.replace(/\u001b\[[0-9;]*m/g, '');
      
      if (errorLine.trim() && 
          !errorLine.includes('INFO') && 
          !errorLine.includes('WARN') &&
          !errorLine.includes('cwd not set') &&
          !errorLine.includes('resume_path: None') &&
          !errorLine.includes('Aborting existing session') &&
          !errorLine.includes('stream disconnected') &&
          !errorLine.includes('retrying turn')) {
        
        const errorMessage: ChatMessage = {
          id: `${sessionId}-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'system',
          content: `Error: ${errorLine}`,
          timestamp: new Date(),
        };
        addMessage(sessionId, errorMessage);
        setSessionLoading(sessionId, false);
      }
    });

    return () => {
      eventUnlisten.then(fn => fn());
      responseUnlisten.then(fn => fn());
      errorUnlisten.then(fn => fn());
    };
  }, [sessionId]);

  return { streamingMessage };
};