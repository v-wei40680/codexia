import { useCallback, useEffect } from 'react';
import { emitTo } from '@tauri-apps/api/event';
import { showMainWindow } from '@/services/tauri/tray';
import { AgentIcon } from './AgentIcon';
import { Composer as CCComposer } from '@/components/cc/composer';
import { useWorkspaceStore, AgentType } from '@/stores/useWorkspaceStore';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { useCCStore } from '@/stores/cc';
import { Composer as CodexComposer, ComposerControls } from '@/components/codex/Composer';
import { TunnelIndicator } from '@/components/features/TunnelIndicator';

const focusCCInput = () => window.dispatchEvent(new Event('cc-input-focus-request'));

interface AgentComposerProps {
  /** When true, layout is content-driven (no fixed height) so the parent can observe and resize. */
  trayMode?: boolean;
}

export function AgentComposer({ trayMode = false }: AgentComposerProps) {
  const { selectedAgent, setSelectedAgent } = useWorkspaceStore();
  const { currentAgentCardId, cards } = useAgentCenterStore();
  const { setView, setActiveSidebarTab } = useLayoutStore();
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

  // Auto-focus the CC composer input when switching to the cc agent
  useEffect(() => {
    if (selectedAgent === 'cc') {
      focusCCInput();
    }
  }, [selectedAgent]);

  const handleTrayOverrideSend = useCallback((text: string) => {
    setActiveSidebarTab(selectedAgent);
    setView('agent');
    emitTo('main', 'tray:pending-send', { kind: selectedAgent, text }).catch(() => { });
    showMainWindow().catch(() => { });
  }, [setView, selectedAgent, setActiveSidebarTab]);

  return (
    <div className={trayMode ? 'flex flex-col' : 'flex flex-col h-full'}>
      {/* Agent tabs */}
      <div className="flex items-center shrink-0">
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
        <TunnelIndicator />
      </div>

      {/* Input area */}
      <div className={trayMode ? 'shrink-0' : 'flex-1 min-h-0 overflow-hidden'}>
        {selectedAgent === 'cc' ? (
          <CCComposer overrideSend={trayMode ? handleTrayOverrideSend : undefined} />
        ) : (
          <CodexComposer showControls={false} overrideSend={trayMode ? handleTrayOverrideSend : undefined} />
        )}
      </div>

      {/* Bottom bar */}
      <div className="shrink-0">
        {selectedAgent === 'codex' && <ComposerControls />}
      </div>
    </div>
  );
}
