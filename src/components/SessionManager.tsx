import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, MessageSquare, X } from 'lucide-react';
import { ChatSession } from '../types/codex';
import { sessionManager } from '../services/sessionManager';

interface SessionManagerProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onCloseSession,
}) => {
  
  const handleCloseSession = async (sessionId: string) => {
    try {
      await sessionManager.stopSession(sessionId);
      onCloseSession(sessionId);
    } catch (error) {
      console.error('Failed to close session:', error);
      // Still close it in the UI even if backend cleanup fails
      onCloseSession(sessionId);
    }
  };
  return (
    <div className="w-64 border-r bg-gray-50 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Chat Sessions</h2>
          <Button
            size="sm"
            onClick={onCreateSession}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chat sessions</p>
            <p className="text-xs">Click + to create one</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-blue-100 border border-blue-200'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {session.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.messages.length} messages
                    </p>
                    {session.messages.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {session.messages[session.messages.length - 1].content.slice(0, 50)}
                        {session.messages[session.messages.length - 1].content.length > 50 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    {session.isActive && (
                      <Badge variant="default" className="text-xs py-0">
                        Active
                      </Badge>
                    )}
                    {sessionManager.isSessionRunning(session.id) && (
                      <Badge variant="secondary" className="text-xs py-0">
                        Running
                      </Badge>
                    )}
                    {session.isLoading && (
                      <Badge variant="outline" className="text-xs py-0">
                        Thinking
                      </Badge>
                    )}
                    {session.pendingApproval && (
                      <Badge variant="destructive" className="text-xs py-0">
                        Approval
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseSession(session.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};