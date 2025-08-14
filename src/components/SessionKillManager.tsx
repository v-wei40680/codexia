import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { sessionManager } from '../services/sessionManager';

interface SessionKillManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionKillManager: React.FC<SessionKillManagerProps> = ({ isOpen, onClose }) => {
  const [runningSessions, setRunningSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [killingSession, setKillingSession] = useState<string | null>(null);

  // Load running sessions
  const loadRunningSessions = async () => {
    setIsLoading(true);
    try {
      await sessionManager.syncWithBackend();
      const sessions = sessionManager.getRunningSessions();
      setRunningSessions(sessions);
    } catch (error) {
      console.error('Failed to load running sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Kill a specific session
  const killSession = async (sessionId: string) => {
    setKillingSession(sessionId);
    try {
      await sessionManager.stopSession(sessionId);
      // Refresh the list
      await loadRunningSessions();
    } catch (error) {
      console.error('Failed to kill session:', error);
      alert(`Failed to kill session: ${error}`);
    } finally {
      setKillingSession(null);
    }
  };

  // Kill all sessions
  const killAllSessions = async () => {
    setIsLoading(true);
    try {
      const promises = runningSessions.map(sessionId => 
        sessionManager.stopSession(sessionId).catch(err => 
          console.error(`Failed to kill session ${sessionId}:`, err)
        )
      );
      await Promise.all(promises);
      await loadRunningSessions();
    } catch (error) {
      console.error('Failed to kill all sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRunningSessions();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Active Sessions
          </DialogTitle>
          <DialogDescription>
            Manage running codex sessions to optimize system performance
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadRunningSessions}
            disabled={isLoading}
            className="h-8 px-3"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

      {/* Session Count and Kill All */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            Running sessions: <Badge variant="secondary">{runningSessions.length}</Badge>
          </span>
          {runningSessions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={killAllSessions}
              disabled={isLoading}
              className="h-7 px-2 text-xs"
            >
              Kill All
            </Button>
          )}
        </div>
        {runningSessions.length > 1 && (
          <p className="text-xs text-orange-600">
            Multiple sessions may cause high CPU usage
          </p>
        )}
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading && runningSessions.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading sessions...
          </div>
        ) : runningSessions.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p>No active sessions</p>
            <p className="text-xs mt-1">Sessions will appear here when started</p>
          </div>
        ) : (
          runningSessions.map((sessionId) => (
            <div
              key={sessionId}
              className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium truncate">
                    {sessionId.length > 20 ? `${sessionId.substring(0, 20)}...` : sessionId}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{sessionId}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => killSession(sessionId)}
                disabled={killingSession === sessionId}
                className="h-7 px-2 ml-2"
              >
                {killingSession === sessionId ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Performance Warning */}
      {runningSessions.length > 2 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">
                Performance Warning
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Multiple sessions can cause high CPU usage and fan noise. Consider killing unused sessions.
              </p>
            </div>
          </div>
        </div>
      )}
      </DialogContent>
    </Dialog>
  );
};