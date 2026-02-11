import { History, PanelLeft, PanelRight, SquarePen, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { codexService } from '@/services/codexService';
import { ProjectSelector } from '@/components/ProjectSelector';
import { useLayoutStore } from '@/stores';
import { useCodexStore, useCurrentThread } from '@/stores/codex';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

type MainHeaderProps = {
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
};

export function MainHeader({ isTerminalOpen, onToggleTerminal }: MainHeaderProps) {
  const { isRightPanelOpen, toggleRightPanel, isSidebarOpen, setSidebarOpen, setView, view } =
    useLayoutStore();
  const { historyMode, setHistoryMode, selectedAgent } = useWorkspaceStore();
  const { handleNewSession } = useCCSessionManager();
  const { currentThreadId, activeThreadIds } = useCodexStore();
  const currentThread = useCurrentThread();
  const showTerminalButton = view === 'codex' || view === 'cc';

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
      <div className="flex items-center gap-2">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleRightPanel}
          title={isRightPanelOpen ? 'Hide right panel' : 'Show right panel'}
        >
          <PanelRight />
        </Button>
      </div>
    </div>
  );
}
