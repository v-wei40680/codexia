import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronDown, Terminal, Server } from 'lucide-react';
import { sessionManager } from '../services/sessionManager';
import { useChatStore } from '../store/chatStore';

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [backendSessions, setBackendSessions] = useState<string[]>([]);
  const { sessions } = useChatStore();

  const refreshBackendSessions = async () => {
    try {
      const runningSessions = await invoke<string[]>('get_running_sessions');
      setBackendSessions(runningSessions);
    } catch (error) {
      console.error('Failed to get running sessions:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshBackendSessions();
      const interval = setInterval(refreshBackendSessions, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const frontendSessions = sessionManager.getRunningSessions();

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          <Terminal className="w-4 h-4" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border rounded-lg shadow-lg w-80 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="font-medium">Debug Panel</span>
        </div>
        <Button
          onClick={() => setIsOpen(false)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-4">
        {/* Sessions Overview */}
        <div>
          <h4 className="text-sm font-medium mb-2">Sessions Overview</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Frontend Sessions:</span>
              <Badge variant="secondary">{sessions.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Manager Sessions:</span>
              <Badge variant="secondary">{frontendSessions.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Backend Sessions:</span>
              <Badge variant="secondary">{backendSessions.length}</Badge>
            </div>
          </div>
        </div>

        {/* Backend Sessions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Backend Sessions</h4>
            <Button
              onClick={refreshBackendSessions}
              variant="outline"
              size="sm"
              className="h-6 text-xs"
            >
              Refresh
            </Button>
          </div>
          <div className="space-y-1">
            {backendSessions.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No backend sessions</div>
            ) : (
              backendSessions.map((sessionId) => (
                <div key={sessionId} className="flex items-center gap-2 text-xs">
                  <Server className="w-3 h-3 text-green-500" />
                  <span className="font-mono text-gray-600">
                    {sessionId.length > 20 ? `${sessionId.slice(0, 20)}...` : sessionId}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Frontend Sessions */}
        <div>
          <h4 className="text-sm font-medium mb-2">Frontend Sessions</h4>
          <div className="space-y-1">
            {sessions.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No frontend sessions</div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    session.isActive ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <span className="font-mono text-gray-600">
                    {session.name}
                  </span>
                  <div className="flex gap-1">
                    {session.isLoading && (
                      <Badge variant="outline" className="text-xs py-0 px-1">
                        Loading
                      </Badge>
                    )}
                    {sessionManager.isSessionRunning(session.id) && (
                      <Badge variant="secondary" className="text-xs py-0 px-1">
                        Running
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div>
          <h4 className="text-sm font-medium mb-2">Actions</h4>
          <div className="space-y-1">
            <Button
              onClick={() => sessionManager.syncWithBackend()}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              Sync with Backend
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};