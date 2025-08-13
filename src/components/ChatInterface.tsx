import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Send, Bot, User, AlertTriangle } from 'lucide-react';
import { ChatMessage, CodexEvent, ApprovalRequest, CodexConfig } from '../types/codex';
import { useChatStore } from '../store/chatStore';
import { sessionManager } from '../services/sessionManager';

interface ChatInterfaceProps {
  sessionId: string;
  config: CodexConfig;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId, config }) => {
  const [inputValue, setInputValue] = useState('');
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Zustand store
  const {
    sessions,
    addMessage,
    setSessionLoading,
    startStreamingMessage,
    appendToStreamingMessage,
    finishStreamingMessage,
  } = useChatStore();

  // Get current session data from store
  const currentSession = sessions.find(s => s.id === sessionId);
  const messages = currentSession?.messages || [];
  const isLoading = currentSession?.isLoading || false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (sessionId) {
      // Ensure this session is running (allows multiple concurrent sessions)
      sessionManager.ensureSessionRunning(sessionId, config)
        .then(() => {
          setIsConnected(true);
          
          // Only add welcome message for new sessions
          if (messages.length === 0) {
            const welcomeMessage: ChatMessage = {
              id: Date.now().toString(),
              type: 'system',
              content: 'Codex session started. You can now chat with the AI assistant.',
              timestamp: new Date(),
            };
            addMessage(sessionId, welcomeMessage);
          }
        })
        .catch((error) => {
          console.error('Failed to start session:', error);
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'system',
            content: `Failed to start Codex session: ${error}`,
            timestamp: new Date(),
          };
          addMessage(sessionId, errorMessage);
        });
    }

    // 监听 codex 事件
    const unlisten = listen<CodexEvent>(`codex-event-${sessionId}`, (event) => {
      const { msg } = event.payload;
      
      switch (msg.type) {
        case 'session_configured':
          console.log('Codex session configured');
          break;
          
        case 'task_started':
          setSessionLoading(sessionId, true);
          break;
          
        case 'task_complete':
          setSessionLoading(sessionId, false);
          break;
          
        case 'agent_message':
          const agentMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'agent',
            content: msg.message || msg.content || '',
            timestamp: new Date(),
          };
          addMessage(sessionId, agentMessage);
          setSessionLoading(sessionId, false);
          break;
          
        case 'agent_message_delta':
          // For streaming responses, check if we have a streaming message to append to
          const currentMessages = sessions.find(s => s.id === sessionId)?.messages || [];
          const lastMessage = currentMessages[currentMessages.length - 1];
          
          if (lastMessage && lastMessage.type === 'agent' && lastMessage.isStreaming) {
            // Append to existing streaming message
            appendToStreamingMessage(sessionId, lastMessage.id, msg.delta);
          } else {
            // Start new streaming message
            const messageId = Date.now().toString();
            startStreamingMessage(sessionId, messageId, msg.delta);
          }
          break;
          
        case 'exec_approval_request':
          const execApproval: ApprovalRequest = {
            id: event.payload.id,
            type: 'exec',
            command: msg.command,
            cwd: msg.cwd,
          };
          setPendingApproval(execApproval);
          break;
          
        case 'patch_approval_request':
          const patchApproval: ApprovalRequest = {
            id: event.payload.id,
            type: 'patch',
            patch: msg.patch,
            files: msg.files,
          };
          setPendingApproval(patchApproval);
          break;
          
        case 'error':
          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'system',
            content: `Error: ${msg.message}`,
            timestamp: new Date(),
          };
          addMessage(sessionId, errorMessage);
          setSessionLoading(sessionId, false);
          break;
          
        case 'turn_complete':
          // 标记当前流式消息为完成
          const sessMessages = sessions.find(s => s.id === sessionId)?.messages || [];
          const lastStreamingMessage = sessMessages[sessMessages.length - 1];
          if (lastStreamingMessage && lastStreamingMessage.isStreaming) {
            finishStreamingMessage(sessionId, lastStreamingMessage.id);
          }
          setSessionLoading(sessionId, false);
          break;
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [sessionId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    addMessage(sessionId, userMessage);
    const messageContent = inputValue;
    setInputValue('');
    setSessionLoading(sessionId, true);

    try {
      await invoke('send_message', {
        sessionId,
        message: messageContent,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Codex Chat</h2>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.isStreaming && (
                <div className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1" />
              )}
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
        <div className="border-t bg-yellow-50 p-4">
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
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 min-h-[40px] max-h-[120px]"
            disabled={!isConnected || isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isConnected || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};