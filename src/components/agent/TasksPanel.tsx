import { useMemo } from 'react';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { useCodexStore } from '@/stores/codex';
import { useCCStore } from '@/stores/cc';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { codexService } from '@/services/codexService';
import { gitRemoveWorktree } from '@/services/tauri/git';
import { AgentCard, ColumnLabel } from './AgentView';
import type { AgentCenterCard } from '@/stores/useAgentCenterStore';

export function TasksPanel() {
  const { cards, removeCard, setCurrentAgentCardId, currentAgentCardId } =
    useAgentCenterStore();
  const { setIsAgentExpanded } = useLayoutStore();
  const {
    switchToSession,
    sessionLoadingMap,
    activeSessionId,
    setActiveSessionId,
  } = useCCStore();
  const { threadStatusMap, currentThreadId } = useCodexStore();
  const { setSelectedAgent } = useWorkspaceStore();

  const isRunning = (card: AgentCenterCard) =>
    card.kind === 'codex'
      ? threadStatusMap[card.id]?.type === 'active'
      : !!sessionLoadingMap[card.id];

  const handleRemove = (card: AgentCenterCard) => {
    removeCard(card);
    if (card.id === currentAgentCardId) {
      setCurrentAgentCardId(null);
    }
    if (card.kind === 'codex') {
      if (card.id === currentThreadId) {
        void codexService.setCurrentThread(null);
      }
    } else {
      if (card.id === activeSessionId) {
        setActiveSessionId(null);
      }
    }
    if (card.worktreePath) {
      const { cwd } = useWorkspaceStore.getState();
      const worktreeKey = card.worktreePath.split('/').pop() ?? '';
      if (cwd && worktreeKey) {
        void gitRemoveWorktree(cwd, worktreeKey);
      }
    }
  };

  const expand = async (card: AgentCenterCard) => {
    setCurrentAgentCardId(card.id);
    setSelectedAgent(card.kind);
    setIsAgentExpanded(true);
    if (card.kind === 'codex') {
      await codexService.setCurrentThread(card.id);
    } else {
      switchToSession(card.id);
    }
  };

  const selectCard = (card: AgentCenterCard) => {
    setCurrentAgentCardId(card.id);
    setSelectedAgent(card.kind);
    if (card.kind === 'codex') void codexService.setCurrentThread(card.id);
    else switchToSession(card.id);
  };

  const runningCards = useMemo(
    () => cards.filter((c) => isRunning(c)),
    [cards, threadStatusMap, sessionLoadingMap],
  );

  const idleCards = useMemo(
    () => cards.filter((c) => !isRunning(c)),
    [cards, threadStatusMap, sessionLoadingMap],
  );

  return (
    <div className="flex flex-row h-full w-full min-w-0 overflow-hidden">
      {/* Running section */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-white/10">
        <ColumnLabel
          dot="green"
          label="Running"
          count={runningCards.length}
        />
        <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
          {runningCards.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40 py-4">
              No running agents
            </div>
          ) : (
            runningCards.map((card) => (
              <div
                key={card.id}
                onClick={() => selectCard(card)}
                className="cursor-pointer"
              >
                <AgentCard
                  card={card}
                  onExpand={() => void expand(card)}
                  onRemove={() => handleRemove(card)}
                  isSelected={card.id === currentAgentCardId}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Idle section */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ColumnLabel dot="muted" label="Idle" count={idleCards.length} />
        <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
          {idleCards.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground/40 py-4">
              No idle agents
            </div>
          ) : (
            idleCards.map((card) => (
              <div
                key={card.id}
                onClick={() => selectCard(card)}
                className="cursor-pointer"
              >
                <AgentCard
                  card={card}
                  onExpand={() => void expand(card)}
                  onRemove={() => handleRemove(card)}
                  isSelected={card.id === currentAgentCardId}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
