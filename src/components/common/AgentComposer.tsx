import { useEffect } from 'react';
import { AgentIcon } from './AgentIcon';
import { CCInput } from '@/components/cc/composer/CCInput';
import { WorkspaceSwitcher } from '@/components/cc/WorkspaceSwitcher';
import { useWorkspaceStore, AgentType } from '@/stores/useWorkspaceStore';
import { useAgentCenterStore } from '@/stores';
import { useCCStore } from '@/stores/cc';
import { Composer } from '@/components/codex/Composer';

export function AgentComposer() {
  const { selectedAgent, setSelectedAgent } = useWorkspaceStore();
  const { currentAgentCardId, cards } = useAgentCenterStore();
  const { switchToSession } = useCCStore();

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

  return (
    <div className="flex flex-col">
      {/* Agent tabs */}
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
