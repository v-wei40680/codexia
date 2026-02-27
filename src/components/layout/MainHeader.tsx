import { useCallback, useEffect } from 'react';
import { Chrome, Diff, Files, History, PanelLeft, PanelRight, SquarePen, StickyNote, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { codexService } from '@/services/codexService';
import { ProjectSelector } from '@/components/project-selector';
import { useLayoutStore } from '@/stores';
import { useCodexStore, useCurrentThread } from '@/stores/codex';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { GitStatsIndicator } from '@/components/features/GitStatsIndicator';
import { useGitStatsStore } from '@/stores/useGitStatsStore';
import { useGitWatch } from '@/hooks/useGitWatch';
import { useSettingsStore } from '@/stores/settings';

type MainHeaderProps = {
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
};

export function MainHeader({ isTerminalOpen, onToggleTerminal }: MainHeaderProps) {
  const {
    isRightPanelOpen,
    toggleRightPanel,
    setRightPanelOpen,
    isSidebarOpen,
    setSidebarOpen,
    setView,
    view,
    activeRightPanelTab,
    setActiveRightPanelTab,
  } = useLayoutStore();
  const { setHistoryMode, selectedAgent, cwd } = useWorkspaceStore();
  const {
    showHeaderTerminalButton,
    showHeaderWebPreviewButton,
    showHeaderNotesButton,
    showHeaderFilesButton,
    showHeaderDiffButton,
    showHeaderRightPanelToggle,
  } = useSettingsStore();
  const { handleNewSession } = useCCSessionManager();
  const { currentThreadId, activeThreadIds } = useCodexStore();
  const { refreshStats } = useGitStatsStore();
  const currentThread = useCurrentThread();
  const showTerminalButton = view === 'codex' || view === 'cc';
  const isHistoryView = view === 'history';
  const openRightPanelTab = (tab: 'diff' | 'note' | 'files' | 'webpreview') => {
    setActiveRightPanelTab(tab);
    setRightPanelOpen(true);
  };

  const refreshGitStats = useCallback(() => {
    void refreshStats(cwd);
  }, [cwd, refreshStats]);

  useEffect(() => {
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
    const nextMode = !isHistoryView;
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
        {selectedAgent === 'codex' &&
          currentThreadId &&
          (view === 'codex' || view === 'history') && (
          <Button
            variant={isHistoryView ? 'secondary' : 'ghost'}
            size="icon"
            onClick={handleToggleHistoryMode}
            title={isHistoryView ? 'Exit history mode' : 'Enter history mode'}
          >
            <History />
          </Button>
        )}
        <ProjectSelector forcedMode="browse" triggerMode="project-name" />
      </div>
      <div className="flex items-center gap-2">
        <span className="flex">
          {showTerminalButton && showHeaderTerminalButton && (
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
              {showHeaderWebPreviewButton && (
                <Button
                  variant={activeRightPanelTab === 'webpreview' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => openRightPanelTab('webpreview')}
                  title="Web Preview"
                >
                  <Chrome />
                </Button>
              )}
              {showHeaderNotesButton && (
                <Button
                  variant={activeRightPanelTab === 'note' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => openRightPanelTab('note')}
                  title="Notes"
                >
                  <StickyNote />
                </Button>
              )}
              {showHeaderFilesButton && (
                <Button
                  variant={activeRightPanelTab === 'files' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => openRightPanelTab('files')}
                  title="Files"
                >
                  <Files />
                </Button>
              )}
            </div>
          )}
          {showHeaderDiffButton && (
            <Button
              variant={activeRightPanelTab === 'diff' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => openRightPanelTab('diff')}
              title="Diff"
              className="rounded-md border"
            >
              <Diff />
              <GitStatsIndicator />
            </Button>
          )}
          {showHeaderRightPanelToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRightPanel}
              title={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
            >
              <PanelRight />
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
