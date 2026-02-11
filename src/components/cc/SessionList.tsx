import { useEffect, useState } from 'react';
import { useCCStore } from '@/stores/ccStore';
import { getSessions, SessionData } from '@/lib/sessions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, List, Activity, MoreVertical, Copy } from 'lucide-react';
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
  onSelectSession?: (sessionId: string) => void;
}

export function ClaudeCodeSessionList({ onSelectSession }: Props) {
  const [allSessions, setAllSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { cwd, setSelectedAgent } = useWorkspaceStore();
  const { setView } = useLayoutStore();
  const { activeSessionIds, activeSessionId } = useCCStore();
  const [activeTab, setActiveTab] = useState('current');
  const { toast } = useToast();

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await getSessions();
        setAllSessions(sessions);

        console.log('Loaded sessions:', {
          cwd,
          totalSessions: sessions.length,
          activeSessionIds,
        });
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
    return <div className="text-sm text-muted-foreground p-2">Loading sessions...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive p-2">Error: {error}</div>;
  }

  const handleSessionClick = (session: SessionData) => {
    setSelectedAgent('cc');
    setView('cc');
    if (onSelectSession) {
      onSelectSession(session.sessionId);
    }
  };

  // Normalize paths for comparison
  const normalizedCwd = cwd.replace(/\\/g, '/');

  const copySessionId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast({
      description: 'Session ID copied to clipboard',
    });
  };

  // Filter sessions by cwd
  const currentProjectSessions = allSessions.filter((s) => {
    const normalizedProject = s.project.replace(/\\/g, '/');
    return normalizedProject === normalizedCwd;
  });

  // Filter sessions by cwd AND active
  const activeSessions = currentProjectSessions.filter((s) =>
    activeSessionIds.includes(s.sessionId)
  );

  const renderSessionList = (
    sessions: SessionData[],
    emptyMessage: string,
    showProject: boolean
  ) => {
    if (sessions.length === 0) {
      return <div className="text-sm text-muted-foreground p-2">{emptyMessage}</div>;
    }

    return (
      <div className="flex min-w-0 max-w-full flex-col gap-1 overflow-x-hidden">
        {sessions.map((session, index) => {
          const isSelected = activeSessionId === session.sessionId;
          const isActive = activeSessionIds.includes(session.sessionId);
          return (
            <div
              key={index}
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

                {showProject && (
                  <div className="mt-0.5 min-w-0 max-w-full">
                    <span
                      className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider ${isSelected ? 'bg-primary/10 text-primary/80' : 'bg-accent/50 text-muted-foreground'}`}
                    >
                      {session.project.split(/[/\\]/).pop()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full min-w-0 max-w-full overflow-x-hidden"
    >
      <TabsList className="grid w-full min-w-0 max-w-full grid-cols-3">
        <TabsTrigger
          value="current"
          className="flex min-w-0 items-center gap-1.5 overflow-hidden px-2"
        >
          <Clock className="h-4 w-4 shrink-0" />
          <span className="truncate text-muted-foreground">({currentProjectSessions.length})</span>
        </TabsTrigger>

        <TabsTrigger value="all" className="flex min-w-0 items-center gap-1.5 overflow-hidden px-2">
          <List className="h-4 w-4 shrink-0" />
          <span className="truncate text-muted-foreground">({allSessions.length})</span>
        </TabsTrigger>

        <TabsTrigger
          value="active"
          className="flex min-w-0 items-center gap-1.5 overflow-hidden px-2"
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span className="truncate text-muted-foreground">({activeSessions.length})</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="current" className="mt-4 w-full min-w-0 max-w-full overflow-x-hidden">
        {renderSessionList(currentProjectSessions, 'No sessions found for this project', false)}
      </TabsContent>

      <TabsContent value="all" className="mt-4 w-full min-w-0 max-w-full overflow-x-hidden">
        {renderSessionList(allSessions, 'No sessions found', true)}
      </TabsContent>

      <TabsContent value="active" className="mt-4 w-full min-w-0 max-w-full overflow-x-hidden">
        {renderSessionList(activeSessions, 'No active sessions in this project', false)}
      </TabsContent>
    </Tabs>
  );
}
