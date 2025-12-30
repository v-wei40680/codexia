import { useEffect, useState } from 'react';
import { useCodexStore } from '@/stores/codex';
import { getSessions, SessionData } from '@/lib/sessions';

export function ClaudeCodeSessionList() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cwd } = useCodexStore();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const allSessions = await getSessions();
        // Filter sessions for current project
        const projectSessions = allSessions.filter(s => s.project === cwd);
        setSessions(projectSessions);
      } catch (err) {
        console.error('Failed to load sessions:', err);
        const message = err instanceof Error ? err.message : 'Failed to load sessions';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [cwd]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading sessions...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">Error: {error}</div>;
  }

  if (sessions.length === 0) {
    return <div className="text-sm text-muted-foreground">No sessions found</div>;
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <span className='mx-auto'>{sessions.length} sessions</span>
      <div className="flex flex-col gap-2">
        {sessions.map((session) => (
          <div key={session.sessionId} className='border p-2 rounded'>
            <div className="text-base truncate">{session.display}</div>
            <div className="space-y-1">
              <p>{new Date(session.timestamp).toLocaleString()}</p>
            </div>
            <span>{session.sessionId.split("-")[0]}</span>
          </div>
        ))}
    </div>
    </div>
  );
}
