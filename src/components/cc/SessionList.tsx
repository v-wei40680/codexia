import { useEffect, useMemo, useState } from 'react';
import { useCCStore } from '@/stores/ccStore';
import { getSessions, SessionData } from '@/lib/sessions';
import { MoreVertical, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useLayoutStore } from '@/stores';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

interface Props {
  project?: string;
  sessions?: SessionData[];
  onSelectSession?: (sessionId: string) => void;
}

export function ClaudeCodeSessionList({ project, sessions, onSelectSession }: Props) {
  const [loadedSessions, setLoadedSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(sessions === undefined);
  const [error, setError] = useState<string | null>(null);
  const { cwd, setCwd, setSelectedAgent } = useWorkspaceStore();
  const { setView } = useLayoutStore();
  const { activeSessionIds, activeSessionId } = useCCStore();
  const { toast } = useToast();

  useEffect(() => {
    if (sessions !== undefined) {
      setLoading(false);
      setError(null);
      return;
    }

    const loadSessions = async () => {
      try {
        const fetched = await getSessions();
        setLoadedSessions(fetched);
      } catch (err) {
        console.error('Failed to load sessions:', err);
        const message = err instanceof Error ? err.message : 'Failed to load sessions';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [sessions]);

  const normalizedProject = useMemo(() => project?.replace(/\\/g, '/'), [project]);
  const allSessions = sessions ?? loadedSessions;
  const visibleSessions = useMemo(() => {
    if (!normalizedProject) {
      return allSessions;
    }
    return allSessions.filter((session) => session.project.replace(/\\/g, '/') === normalizedProject);
  }, [allSessions, normalizedProject]);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-2">Loading sessions...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive p-2">Error: {error}</div>;
  }

  const handleSessionClick = (session: SessionData) => {
    if (session.project && session.project !== cwd) {
      setCwd(session.project);
    }
    setSelectedAgent('cc');
    setView('cc');
    if (onSelectSession) {
      onSelectSession(session.sessionId);
    }
  };

  const copySessionId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast({
      description: 'Session ID copied to clipboard',
    });
  };

  if (visibleSessions.length === 0) {
    return <div className="text-sm text-muted-foreground p-2">No sessions in this project</div>;
  }

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-1 overflow-x-hidden">
      {visibleSessions.map((session) => {
        const isSelected = activeSessionId === session.sessionId;
        const isActive = activeSessionIds.includes(session.sessionId);
        return (
          <div
            key={session.sessionId}
            className={`group w-full min-w-0 max-w-full overflow-hidden rounded-lg border p-3 transition-all duration-200 cursor-pointer ${
              isSelected
                ? 'border-primary bg-primary/[0.06] dark:bg-primary/[0.15] shadow-sm'
                : 'border-border/50 hover:border-primary/30 hover:bg-accent/50'
            }`}
            onClick={() => handleSessionClick(session)}
          >
            <div className="flex min-w-0 max-w-full flex-col gap-1">
              <div className="flex min-w-0 max-w-full items-start justify-between gap-2">
                <div
                  className={`min-w-0 max-w-full truncate text-sm font-medium ${isSelected ? 'text-primary' : ''}`}
                >
                  {session.display}
                </div>
              </div>

              <div className="flex min-w-0 max-w-full items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {isActive && (
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  )}
                  <div className="min-w-0 truncate text-xs text-muted-foreground">
                    {new Date(session.timestamp * 1000).toLocaleString()}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-6 w-6 -mr-1 transition-colors ${isSelected ? 'hover:bg-primary/10' : 'hover:bg-accent'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => copySessionId(e, session.sessionId)}>
                      <Copy className="h-3 w-3 mr-2" />
                      <span>Copy Session ID</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
