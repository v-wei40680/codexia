import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Bot, User, AlertTriangle, X, History } from 'lucide-react';
import { ChatMessage, ApprovalRequest, CodexConfig, CodexEvent } from '@/types/codex';
import { useChatStore } from '../stores/chatStore';
import { sessionManager } from '../services/sessionManager';
import { SessionManager } from './SessionManager';
import { ChatInput } from './ChatInput';

interface ChatInterfaceProps {
  sessionId: string;
  config: CodexConfig;
  sessions?: any[];
  activeSessionId?: string;
  onCreateSession?: () => void;
  onSelectSession?: (sessionId: string) => void;
  onCloseSession?: (sessionId: string) => void;
  isSessionListVisible?: boolean;
  historyMessages?: any[];
  onClearHistory?: () => void;
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
  historyMessages = [],
  onClearHistory,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand stores
  const {
    sessions,
    addMessage,
    setSessionLoading,
  } = useChatStore();

  // Get current session data from store
  const currentSession = sessions.find(s => s.id === sessionId);
  const sessionMessages = currentSession?.messages || [];
  
  // Convert history messages to ChatInterface format
  const convertedHistoryMessages = historyMessages.map((msg, index) => ({
    id: `history-${index}`,
    type: msg.role === 'user' ? 'user' : 'agent',
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    isStreaming: false,
  }));
  
  // Combine history messages with current session messages and streaming message
  const allMessages = [...convertedHistoryMessages, ...sessionMessages];
  if (streamingMessage) {
    allMessages.push(streamingMessage);
  }
  const messages = allMessages;
  const isLoading = currentSession?.isLoading || false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      // Check if session is already running
      const isRunning = sessionManager.isSessionRunning(sessionId);
      setIsConnected(isRunning);
      
      // Auto-start session if it's not running and no messages exist yet
      if (!isRunning && messages.length === 0) {
        const startSession = async () => {
          try {
            setSessionLoading(sessionId, true);
            await sessionManager.ensureSessionRunning(sessionId, config);
            setIsConnected(true);
            
            // Add welcome message for newly started sessions
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

    // Listen for protocol events
    const eventUnlisten = listen<CodexEvent>(`codex-event-${sessionId}`, (event) => {
      const codexEvent = event.payload;
      console.log('Received codex event:', codexEvent);
      
      handleCodexEvent(codexEvent);
    });
    
    // Keep old response listener for backward compatibility
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
    
    // watch codex error events
    const errorUnlisten = listen<string>(`codex-error:${sessionId}`, (event) => {
      let errorLine = event.payload;
      console.log('Received codex error:', errorLine); // Debug log
      
      // Remove ANSI escape sequences from error messages
      errorLine = errorLine.replace(/\u001b\[[0-9;]*m/g, '');
      
      // Filter out non-critical log messages and only show actual errors
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

  // Handle protocol events
  const handleCodexEvent = (event: CodexEvent) => {
    const { msg } = event;
    
    switch (msg.type) {
      case 'session_configured':
        console.log('Session configured:', msg.session_id);
        setIsConnected(true);
        break;
        
      case 'task_started':
        setSessionLoading(sessionId, true);
        break;
        
      case 'task_complete':
        setSessionLoading(sessionId, false);
        if (streamingMessage) {
          // Finalize streaming message
          const finalMessage = { ...streamingMessage, isStreaming: false };
          addMessage(sessionId, finalMessage);
          setStreamingMessage(null);
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
          // Update existing streaming message
          const updatedMessage = {
            ...streamingMessage,
            content: streamingMessage.content + msg.delta,
          };
          setStreamingMessage(updatedMessage);
        } else {
          // Start new streaming message
          const newMessage: ChatMessage = {
            id: `${sessionId}-stream-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type: 'agent',
            content: msg.delta,
            timestamp: new Date(),
            isStreaming: true,
          };
          setStreamingMessage(newMessage);
        }
        break;
        
      case 'exec_approval_request':
        setPendingApproval({
          id: event.id,
          type: 'exec',
          command: msg.command,
          cwd: msg.cwd,
        });
        break;
        
      case 'patch_approval_request':
        setPendingApproval({
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
        setIsConnected(false);
        console.log('Session shutdown completed');
        break;
        
      case 'background_event':
        console.log('Background event:', msg.message);
        // You can choose to display background events as system messages if needed
        // For now, just log them
        break;
        
      default:
        console.log('Unhandled event type:', msg.type);
    }
  };

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
      {/* Header */}
      <div className="flex-shrink-0 border-b p-2 flex items-center justify-between bg-white z-10">
        <div className="flex items-center gap-2">
          {historyMessages.length > 0 ? (
            <>
              <History className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-semibold">History View ({historyMessages.length} messages)</span>
            </>
          ) : (
            <span className="text-lg font-semibold">Codex Chat</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {historyMessages.length > 0 && onClearHistory && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearHistory}
              className="h-8 px-2"
            >
              <X className="w-4 h-4 mr-1" />
              Clear History
            </Button>
          )}
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type !== 'user' && (
              <div className="flex-shrink-0">
                {message.type === 'agent' ? (
                  <Bot className="w-8 h-8 p-1 bg-blue-100 text-blue-600 rounded-full" />
                ) : (
                  <AlertTriangle className="w-8 h-8 p-1 bg-yellow-100 text-yellow-600 rounded-full" />
                )}
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'agent'
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-5 bg-current opacity-75 animate-pulse ml-1 align-text-bottom">|</span>
                )}
              </div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>

            {message.type === 'user' && (
              <div className="flex-shrink-0">
                <User className="w-8 h-8 p-1 bg-green-100 text-green-600 rounded-full" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Bot className="w-8 h-8 p-1 bg-blue-100 text-blue-600 rounded-full" />
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Approval Request */}
      {pendingApproval && (
        <div className="flex-shrink-0 border-t bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800">
                {pendingApproval.type === 'exec' ? 'Command Execution Request' : 'Code Patch Request'}
              </h3>
              {pendingApproval.type === 'exec' ? (
                <div className="mt-2">
                  <p className="text-sm text-yellow-700">Command:</p>
                  <code className="block bg-yellow-100 p-2 rounded text-sm mt-1">
                    {pendingApproval.command}
                  </code>
                  <p className="text-xs text-yellow-600 mt-1">
                    Working directory: {pendingApproval.cwd}
                  </p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-yellow-700">Files to be modified:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-600 mt-1">
                    {pendingApproval.files?.map((file, idx) => (
                      <li key={idx}>{file}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleApproval(false)}
              >
                Deny
              </Button>
              <Button
                size="sm"
                onClick={() => handleApproval(true)}
              >
                Allow
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
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