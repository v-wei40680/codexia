import { useState, useEffect } from 'react';
import { AgentIcon } from './AgentIcon';
import { CCInput } from '@/components/cc/composer/CCInput';
import { WorkspaceSwitcher } from '@/components/cc/WorkspaceSwitcher';
import { gitBranchInfo, type GitBranchInfoResponse } from '@/services/tauri/git';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useAgentCenterStore } from '@/stores';
import { useCCStore } from '@/stores/ccStore';
import { Composer } from '@/components/codex/Composer';

type Agent = 'codex' | 'cc';

export function AgentComposer() {
  const { cwd, selectedAgent, setSelectedAgent } = useWorkspaceStore();
  const activeAgent = selectedAgent;
  const setActiveAgent = setSelectedAgent;
  const [branchInfo, setBranchInfo] = useState<GitBranchInfoResponse | null>(null);
  const { currentAgentCardId, cards } = useAgentCenterStore();
  const { switchToSession } = useCCStore();

  // Sync tab and active session to the currently selected card
  useEffect(() => {
    if (!currentAgentCardId) return;
    const card = cards.find((c) => c.id === currentAgentCardId);
    if (!card) return;
    setActiveAgent(card.kind);
    if (card.kind === 'cc') {
      switchToSession(card.id);
    }
  }, [currentAgentCardId]);

  useEffect(() => {
    if (!cwd) { setBranchInfo(null); return; }
    gitBranchInfo(cwd).then(setBranchInfo).catch(() => setBranchInfo(null));
  }, [cwd]);

  function refreshBranchInfo() {
    if (!cwd) return;
    gitBranchInfo(cwd).then(setBranchInfo).catch(() => setBranchInfo(null));
  }

  return (
    <div className="flex flex-col">
      {/* Agent tabs */}
      <div className="flex items-center gap-1 px-2 pt-1.5 border-t bg-background">
        {(['cc', 'codex'] as Agent[]).map((agent) => (
          <button
            key={agent}
            onClick={() => setActiveAgent(agent)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeAgent === agent
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
      {activeAgent === 'cc' ? (
        <>
          <CCInput />
          {cwd && (
            <div className="px-4 pb-2">
              <WorkspaceSwitcher cwd={cwd} branchInfo={branchInfo} onBranchChanged={refreshBranchInfo} />
            </div>
          )}
        </>
      ) : (
        <Composer />
      )}
    </div>
  );
}
