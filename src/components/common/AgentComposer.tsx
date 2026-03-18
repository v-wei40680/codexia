import { useCallback, useEffect } from 'react';
import { SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentIcon } from './AgentIcon';
import { CCInput } from '@/components/cc/composer/CCInput';
import { WorkspaceSwitcher } from '@/components/cc/WorkspaceSwitcher';
import { useWorkspaceStore, AgentType } from '@/stores/useWorkspaceStore';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { useCCStore } from '@/stores/cc';
import { Composer } from '@/components/codex/Composer';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useThreadList } from '@/hooks/codex';

const focusCCInput = () => window.dispatchEvent(new Event('cc-input-focus-request'));

export function AgentComposer() {
  const { selectedAgent, setSelectedAgent, cwd, setCwd } = useWorkspaceStore();
  const { currentAgentCardId, cards, setCurrentAgentCardId } = useAgentCenterStore();
  const { view, setView, setActiveSidebarTab } = useLayoutStore();
  const { switchToSession } = useCCStore();
  const { handleNewSession } = useCCSessionManager();
  const { handleNewThread } = useThreadList({ enabled: true });

  // Sync tab and active session to the currently selected card
  useEffect(() => {
    if (!currentAgentCardId) return;
    const card = cards.find((c) => c.id === currentAgentCardId);
    if (!card) return;
    setSelectedAgent(card.kind);
    if (card.kind === 'cc') {
      switchToSession(card.id);
    }
  }, [currentAgentCardId]);

  const handleCreateNew = useCallback(
    async (project?: string) => {
      if (project && project !== cwd) setCwd(project);

      if (selectedAgent === 'cc') {
        setActiveSidebarTab('cc');
        setCurrentAgentCardId(null);
        setView('agent');
        await handleNewSession();
        focusCCInput();
        return;
      }
      await handleNewThread();
    },
    [cwd, handleNewSession, handleNewThread, selectedAgent, setActiveSidebarTab, setCwd, setCurrentAgentCardId, setView],
  );

  // Keyboard shortcut: Cmd/Ctrl+N → new thread / session
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(target.closest('[contenteditable="true"]'))
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isNew = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n';
      if (!isNew || e.shiftKey || e.altKey || e.repeat) return;
      if (view !== 'agent') return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      void handleCreateNew();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateNew, view]);

  return (
    <div className="flex flex-col">
      {/* Agent tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {(['cc', 'codex'] as AgentType[]).map((agent) => (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${selectedAgent === agent
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <AgentIcon agent={agent} />
              <span>{agent === 'cc' ? 'Claude Code' : 'Codex'}</span>
            </button>
          ))}
        </div>

        <Button
          onClick={() => void handleCreateNew()}
          size="icon"
          variant="ghost"
          title={selectedAgent === 'cc' ? 'New Session (⌘N)' : 'New Thread (⌘N)'}
        >
          <SquarePen size={16} />
        </Button>
      </div>

      {/* Composer area */}
      {selectedAgent === 'cc' ? (
        <>
          <CCInput />
          <WorkspaceSwitcher />
        </>
      ) : (
        <Composer />
      )}
    </div>
  );
}
