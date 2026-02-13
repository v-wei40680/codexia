import { useCallback, useEffect } from 'react';
import { Chrome, Diff, Files, GitBranch, History, PanelLeft, SquarePen, StickyNote, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { codexService } from '@/services/codexService';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useLayoutStore } from '@/stores';
import { useCodexStore, useCurrentThread } from '@/stores/codex';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { GitStatsIndicator } from '@/components/features/GitStatsIndicator';
import { useGitStatsStore } from '@/stores/useGitStatsStore';
import { useGitWatch } from '@/hooks/useGitWatch';

type MainHeaderProps = {
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
};

export function MainHeader({ isTerminalOpen, onToggleTerminal }: MainHeaderProps) {
  const {
    isRightPanelOpen,
    toggleRightPanel,
    isSidebarOpen,
    setSidebarOpen,
    setView,
    view,
    activeRightPanelTab,
    setActiveRightPanelTab,
  } = useLayoutStore();
  const { historyMode, setHistoryMode, selectedAgent, cwd } = useWorkspaceStore();
  const { handleNewSession } = useCCSessionManager();
  const { currentThreadId, activeThreadIds } = useCodexStore();
  const { refreshStats } = useGitStatsStore();
  const currentThread = useCurrentThread();
  const showTerminalButton = view === 'codex' || view === 'cc';

  const refreshGitStats = useCallback(() => {
    if (!cwd) return;
    void refreshStats(cwd);
  }, [cwd, refreshStats]);

  useEffect(() => {
    if (!cwd) return;
    refreshGitStats();
  }, [cwd, refreshGitStats]);

  useGitWatch(cwd || null, refreshGitStats, Boolean(cwd));

  const handleNewThread = async () => {
    if (selectedAgent === 'cc') {
      setView('cc');
      await handleNewSession();
      return;
    }
    await codexService.setCurrentThread(null);
  };
  const handleToggleHistoryMode = async () => {
    const nextMode = !historyMode;
    setHistoryMode(nextMode);
    setView(nextMode ? 'history' : 'codex');

    if (!nextMode) {
      const targetThreadId = currentThreadId ?? currentThread?.id ?? null;
      if (targetThreadId && !activeThreadIds.includes(targetThreadId)) {
        await codexService.setCurrentThread(targetThreadId);
      }
    }
  };

  const shouldShowIcons = !isSidebarOpen;

  return (
    <div
      className="flex items-center justify-between h-11 border-b border-white/10 bg-sidebar/20 px-3"
      data-tauri-drag-region
    >
      <div className="flex min-w-0 items-center gap-2">
        {shouldShowIcons && (
          <div className="flex items-center gap-2 pl-20">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <PanelLeft />
            </Button>
            <Button variant="ghost" onClick={handleNewThread} size="icon">
              <SquarePen />
            </Button>
          </div>
        )}
        {selectedAgent === 'codex' && currentThreadId && (
          <Button
            variant={historyMode ? 'secondary' : 'ghost'}
            size="icon"
            onClick={handleToggleHistoryMode}
            title={historyMode ? 'Exit history mode' : 'Enter history mode'}
          >
            <History />
          </Button>
        )}
        <ProjectSelector />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex">
          {showTerminalButton && (
            <Button
              variant={isTerminalOpen ? 'secondary' : 'ghost'}
              size="icon"
              onClick={onToggleTerminal}
              title={isTerminalOpen ? 'Hide terminal' : 'Show terminal'}
            >
              <Terminal />
            </Button>
          )}
          {isRightPanelOpen && (
            <div className="flex items-center">
              <Button
                variant={activeRightPanelTab === 'diff' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveRightPanelTab('diff')}
                title="Diff"
              >
                <GitBranch />
              </Button>
              <Button
                variant={activeRightPanelTab === 'note' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveRightPanelTab('note')}
                title="Notes"
              >
                <StickyNote />
              </Button>
              <Button
                variant={activeRightPanelTab === 'files' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveRightPanelTab('files')}
                title="Files"
              >
                <Files />
              </Button>
              <Button
                variant={activeRightPanelTab === 'webpreview' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveRightPanelTab('webpreview')}
                title="Web Preview"
              >
                <Chrome />
              </Button>
            </div>
          )}
          {/* Git statistics indicator */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRightPanel}
            title={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
            className="rounded-md border"
          >
            <Diff />
            <GitStatsIndicator />
          </Button>
        </span>
      </div>
    </div>
  );
}
