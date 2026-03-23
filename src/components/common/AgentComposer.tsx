import { useCallback, useEffect, useState } from 'react';
import { emitTo } from '@tauri-apps/api/event';
import { showMainWindow } from '@/services/tauri/tray';
import { AgentIcon } from './AgentIcon';
import { Composer as CCComposer } from '@/components/cc/composer';
import { useWorkspaceStore, AgentType } from '@/stores/useWorkspaceStore';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { useCCStore } from '@/stores/cc';
import { Composer as CodexComposer, ComposerControls } from '@/components/codex/Composer';
import { TunnelIndicator } from '@/components/features/TunnelIndicator';
import { buildUrl, isDesktopTauri } from '@/hooks/runtime';

function CCDebugBadge() {
  const [msgCount, setMsgCount] = useState(0);
  const [rawCount, setRawCount] = useState(0); // any SSE message received
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<'connecting' | 'open' | 'error'>('connecting');

  useEffect(() => {
    if (isDesktopTauri()) {
      import('@tauri-apps/api/event').then(({ listen }) => {
        const p1 = listen<unknown>('cc-message', () => {
          setMsgCount((n) => n + 1);
          setLastEvent('cc-msg');
        });
        const p2 = listen<unknown>('cc-permission-request', () => {
          setMsgCount((n) => n + 1);
          setLastEvent('cc-perm');
        });
        return () => {
          void p1.then((fn) => fn());
          void p2.then((fn) => fn());
        };
      });
      return;
    }
    // SSE path — count ALL raw messages to detect if SSE stream is alive
    const es = new EventSource(buildUrl('/api/events'));
    es.onopen = () => setSseStatus('open');
    es.onerror = () => setSseStatus('error');
    es.onmessage = (e) => {
      setRawCount((n) => n + 1);
      try {
        const env = JSON.parse(e.data as string) as { event?: string };
        setLastEvent(env.event ?? 'unknown');
        if (env.event === 'cc-message' || env.event === 'cc-permission-request') {
          setMsgCount((n) => n + 1);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  const isDesktop = isDesktopTauri();
  const mode = isDesktop ? 'tauri' : `sse:${sseStatus}`;
  const color = !isDesktop && sseStatus === 'error' ? 'text-red-500' : msgCount > 0 ? 'text-green-500' : 'text-muted-foreground';
  return (
    <span className={`text-[10px] font-mono ml-1 ${color}`}>
      {mode} raw:{rawCount} cc:{msgCount}{lastEvent ? ` ${lastEvent}` : ''}
    </span>
  );
}

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
    <div className="flex flex-col">
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
        {import.meta.env.DEV && <CCDebugBadge />}
      </div>

      {/* Input area */}
      <div className="shrink-0">
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
