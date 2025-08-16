import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChatMessage, ApprovalRequest, CodexConfig } from '@/types/codex';
import type { Conversation } from '@/types/chat';
import { useChatStore } from '../stores/chatStore';
import { useConversationStore } from '../stores/ConversationStore';
import { sessionManager } from '../services/sessionManager';
import { SessionManager } from './SessionManager';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './chat/MessageList';
import { ApprovalDialog } from './ApprovalDialog';
import { useCodexEvents } from '../hooks/useCodexEvents';

interface ChatInterfaceProps {
  sessionId: string;
  config: CodexConfig;
  sessions?: any[];
  activeSessionId?: string;
  onCreateSession?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onCloseSession?: (sessionId: string) => void;
  isSessionListVisible?: boolean;
  selectedConversation?: Conversation | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  sessionId, 
  config, 
  sessions: propSessions = [],
  activeSessionId: propActiveSessionId = '',
  onCreateSession,
  onSelectSession,
  onCloseSession,
  isSessionListVisible = false,
  selectedConversation = null,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { sessions, addMessage, setSessionLoading } = useChatStore();
  const { conversations } = useConversationStore();
  
  // Priority: selectedConversation (from disk) > conversations (from store) > current session
  const historicalConversation = selectedConversation || conversations.find(conv => conv.id === sessionId);
  const currentSession = sessions.find(s => s.id === sessionId);
  
  // Use historical messages if available, otherwise use current session messages
  const sessionMessages = historicalConversation 
    ? historicalConversation.messages.map(msg => ({
        id: msg.id,
        type: (msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'agent' : 'system') as 'user' | 'agent' | 'system',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        isStreaming: false,
      }))
    : currentSession?.messages || [];
  
  const { streamingMessage } = useCodexEvents({
    sessionId,
    onApprovalRequest: setPendingApproval,
    onStreamingMessage: () => {},
  });
  
  const messages = [...sessionMessages];
  if (streamingMessage) {
    messages.push(streamingMessage);
  }
  const isLoading = currentSession?.isLoading || false;

  useEffect(() => {
    if (sessionId) {
      const isRunning = sessionManager.isSessionRunning(sessionId);
      setIsConnected(isRunning);
      
      // Don't auto-start session if we're viewing a historical conversation
      if (!isRunning && messages.length === 0 && !historicalConversation) {
        const startSession = async () => {
          try {
            setSessionLoading(sessionId, true);
            await sessionManager.ensureSessionRunning(sessionId, config);
            setIsConnected(true);
            
            const welcomeMessage: ChatMessage = {
              id: `${sessionId}-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              type: 'system',
              content: 'Codex session started. You can now chat with the AI assistant.',
              timestamp: new Date(),
            };
            addMessage(sessionId, welcomeMessage);
            setSessionLoading(sessionId, false);
          } catch (error) {
            console.error('Failed to auto-start session:', error);
            const errorMessage: ChatMessage = {
              id: `${sessionId}-auto-start-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
              type: 'system',
              content: `Failed to start Codex session: ${error}`,
              timestamp: new Date(),
            };
            addMessage(sessionId, errorMessage);
            setSessionLoading(sessionId, false);
          }
        };
        
        startSession();
      }
    }
  }, [sessionId, historicalConversation]);


  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    // Ensure session is running before sending message
    try {
      if (!sessionManager.isSessionRunning(sessionId)) {
        setSessionLoading(sessionId, true);
        await sessionManager.ensureSessionRunning(sessionId, config);
        setIsConnected(true);
        setSessionLoading(sessionId, false);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      const errorMessage: ChatMessage = {
        id: `${sessionId}-startup-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'system',
        content: `Failed to start Codex session: ${error}`,
        timestamp: new Date(),
      };
      addMessage(sessionId, errorMessage);
      setSessionLoading(sessionId, false);
      return;
    }

    const userMessage: ChatMessage = {
      id: `${sessionId}-user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    addMessage(sessionId, userMessage);
    setSessionLoading(sessionId, true);

    try {
      await invoke('send_message', {
        sessionId,
        message: messageContent,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: `${sessionId}-send-error-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'system',
        content: `Failed to send message: ${error}`,
        timestamp: new Date(),
      };
      addMessage(sessionId, errorMessage);
      setSessionLoading(sessionId, false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!pendingApproval) return;

    try {
      await invoke('approve_execution', {
        sessionId,
        approvalId: pendingApproval.id,
        approved,
      });
      setPendingApproval(null);
    } catch (error) {
      console.error('Failed to send approval:', error);
    }
  };


  return (
    <div className="flex h-full min-h-0">
      {/* Session Manager - conditionally visible */}
      {isSessionListVisible && onCreateSession && onSelectSession && onCloseSession && (
        <div className="w-64 flex-shrink-0 border-r bg-white">
          <SessionManager
            sessions={propSessions}
            activeSessionId={propActiveSessionId}
            onCreateSession={onCreateSession}
            onSelectSession={onSelectSession}
            onCloseSession={onCloseSession}
          />
        </div>
      )}
      
      {/* Chat Interface */}
      <div className="flex flex-col flex-1 min-h-0">
        <ChatHeader 
          isConnected={isConnected}
          isHistoryView={!!historicalConversation}
          historyMessageCount={historicalConversation?.messages.length || 0}
        />
        
        <MessageList 
          messages={messages}
          isLoading={isLoading}
        />
        
        <ApprovalDialog 
          pendingApproval={pendingApproval}
          onApproval={handleApproval}
        />

        <ChatInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          disabled={false}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};