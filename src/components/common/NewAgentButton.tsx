import { useCallback, useEffect } from 'react';
import { SquarePen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAgentCenterStore } from '@/stores';
import { useLayoutStore } from '@/stores';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useThreadList } from '@/hooks/codex';

const focusCCInput = () => window.dispatchEvent(new Event('cc-input-focus-request'));

export function NewAgentButton() {
  const { selectedAgent, cwd, setCwd } = useWorkspaceStore();
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const { view, setView, setActiveSidebarTab } = useLayoutStore();
  const { handleNewSession } = useCCSessionManager();
  const { handleNewThread } = useThreadList({ enabled: true });

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
    <Button
      onClick={() => void handleCreateNew()}
      size="icon"
      variant="ghost"
      title={selectedAgent === 'cc' ? 'New Session (⌘N)' : 'New Thread (⌘N)'}
    >
      <SquarePen size={16} />
    </Button>
  );
}

