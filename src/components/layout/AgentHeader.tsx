import {
  Circle,
  History,
  PanelLeft,
  SquarePen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { codexService } from '@/services/codexService';
import { ProjectSelector } from '@/components/project-selector';
import { useLayoutStore } from '@/stores';
import { useCodexStore, useCurrentThread } from '@/stores/codex';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { RightPanelHeader } from './RightPanelHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCCStore } from '@/stores/cc';
import { useAgentCenterStore } from '@/stores';
import { isTauri } from '@/hooks/runtime';

export function AgentHeader() {
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const requestFocusCCInput = () => {
    window.dispatchEvent(new Event('cc-input-focus-request'));
  };

  const {
    isSidebarOpen,
    setSidebarOpen,
    setView,
    view,
  } = useLayoutStore();
  const { setHistoryMode, selectedAgent } = useWorkspaceStore();

  const { handleNewSession } = useCCSessionManager();
  const { isConnected } = useCCStore();
  const { currentThreadId, activeThreadIds } = useCodexStore();
  const isMobile = useIsMobile();
  const currentThread = useCurrentThread();
  const isHistoryView = view === 'history';

  const handleNewThread = async () => {
    setCurrentAgentCardId(null);
    if (selectedAgent === 'cc') {
      setView('agent');
      await handleNewSession();
      requestFocusCCInput();
      return;
    }
    await codexService.setCurrentThread(null);
  };
  const handleToggleHistoryMode = async () => {
    const nextMode = !isHistoryView;
    setHistoryMode(nextMode);
    setView(nextMode ? 'history' : 'agent');

    if (!nextMode) {
      const targetThreadId = currentThreadId ?? currentThread?.id ?? null;
      if (targetThreadId && !activeThreadIds.includes(targetThreadId)) {
        await codexService.setCurrentThread(targetThreadId);
      }
    }
  };

  return (
    <div
      className="flex items-center justify-between h-11 border-b border-white/10 bg-sidebar/20"
      data-tauri-drag-region
    >
      <div className="flex min-w-0 items-center gap-2">
        {!isSidebarOpen && (
          <div className={`flex items-center ${!isMobile ? 'pl-20' : 'pl-2'}`}>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <PanelLeft />
            </Button>
            <Button variant="ghost" onClick={handleNewThread} size="icon">
              <SquarePen />
            </Button>
          </div>
        )}
        {view === 'agent' && selectedAgent === 'cc' && (
          <span
            title={isConnected ? 'Connected' : 'Ready'}
            aria-label={isConnected ? 'Connected' : 'Ready'}
          >
            <Circle
              className={`size-3 ${isConnected
                ? 'fill-emerald-500 text-emerald-500'
                : 'fill-transparent text-emerald-500/80'
                }`}
            />
          </span>
        )}
        {selectedAgent === 'codex' &&
          currentThreadId &&
          (view === 'agent' || view === 'history') && (
            <Button
              variant={isHistoryView ? 'secondary' : 'ghost'}
              size="icon"
              onClick={handleToggleHistoryMode}
              title={isHistoryView ? 'Exit history mode' : 'Enter history mode'}
            >
              <History />
            </Button>
          )}
        {!isTauri() && (
          <ProjectSelector forcedMode="browse" triggerMode="project-name" />
        )}
      </div>
      <RightPanelHeader />
    </div>
  );
}
