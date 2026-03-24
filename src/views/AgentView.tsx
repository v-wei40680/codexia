import { lazy, Suspense, useState, useMemo } from 'react';
import { useAgentCenterStore } from '@/stores';
import { useLayoutStore } from '@/stores';
import { useCodexStore, useApprovalStore, useRequestUserInputStore } from '@/stores/codex';
import { useCCStore } from '@/stores/cc';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { codexService } from '@/services/codexService';
import { ArrowLeft, X, Maximize2 } from 'lucide-react';
import type { AgentCenterCard } from '@/stores/useAgentCenterStore';
import { AgentIcon } from '@/components/common/AgentIcon';
import { AgentComposer, GetProButton } from '@/components/common';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Lock, Plus } from 'lucide-react';

const PRICING_URL = 'https://milisp.dev/pricing';
import { CodexGridCard } from './CodexGridCard';
import { CCGridCard } from './CCGridCard';

const ChatInterface = lazy(() =>
  import('@/components/codex/ChatInterface').then((m) => ({ default: m.ChatInterface }))
);
const CCView = lazy(() => import('@/components/cc/CCView'));

// CardHeader

type CardStatus = 'running' | 'pending' | 'idle';

interface CardHeaderProps {
  card: AgentCenterCard;
  onClose?: () => void;
  onBack?: () => void;
  onSelect?: () => void;
  onExpand?: () => void;
  status?: CardStatus;
}

export function CardHeader({ card, onClose, onBack, onSelect, onExpand, status = 'idle' }: CardHeaderProps) {
  const title = card.preview?.slice(0, 60) || card.id.slice(0, 12);

  const dotColor =
    status === 'running' ? 'bg-green-500' :
      status === 'pending' ? 'bg-amber-500' :
        'bg-muted-foreground/40';

  const dotAnimate = status !== 'idle' ? 'animate-pulse' : '';

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30 shrink-0"
      onClick={onSelect}
      style={onSelect ? { cursor: 'pointer' } : undefined}
    >
      {onBack && (
        <button
          onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      )}
      {onClose && (
        // Shows a status dot by default; reveals the X button on hover.
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="group relative h-3.5 w-3.5 flex items-center justify-center shrink-0"
          aria-label="Remove"
        >
          <span className={`absolute h-2 w-2 rounded-full transition-opacity duration-150 group-hover:opacity-0 ${dotColor} ${dotAnimate}`} />
          <X className="h-3.5 w-3.5 text-destructive/60 hover:text-destructive absolute opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </button>
      )}
      <AgentIcon agent={card.kind} />
      <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{title}</span>
      {onExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); onExpand(); }}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Expand"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface GridCardProps {
  card: AgentCenterCard;
  onExpand: () => void;
  onRemove: () => void;
  isSelected: boolean;
}

function GridCard({ card, onExpand, onRemove, isSelected }: GridCardProps) {
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const { sessionLoadingMap, sessionMessagesMap, activeSessionIds } = useCCStore();
  const { threadStatusMap } = useCodexStore();
  const { pendingApprovals } = useApprovalStore();
  const { pendingRequests } = useRequestUserInputStore();
  const codexStatus = card.kind === 'codex' ? threadStatusMap[card.id] : undefined;
  const running =
    card.kind === 'codex'
      ? codexStatus?.type === 'active' && codexStatus.activeFlags.length === 0
      : activeSessionIds.includes(card.id) && !!sessionLoadingMap[card.id];

  const pending =
    card.kind === 'codex'
      ? codexStatus?.type === 'active' && codexStatus.activeFlags.length > 0
      : (sessionMessagesMap[card.id] ?? []).some(
        (m) => m.type === 'permission_request' && !(m as any).resolved
      ) ||
      pendingApprovals.some((a) => (a as any).threadId === card.id) ||
      pendingRequests.some((r) => r.threadId === card.id);

  const status: CardStatus = running ? 'running' : pending ? 'pending' : 'idle';

  const header = (
    <CardHeader
      card={card}
      onClose={onRemove}
      onSelect={() => {
        setCurrentAgentCardId(card.id);
        if (card.kind === 'codex') void codexService.setCurrentThread(card.id);
      }}
      onExpand={onExpand}
      status={status}
    />
  );

  if (card.kind === 'codex') {
    return (
      <CodexGridCard
        card={card as AgentCenterCard & { kind: 'codex' }}
        onRemove={onRemove}
        header={header}
        isSelected={isSelected}
      />
    );
  }

  return (
    <CCGridCard
      card={card as AgentCenterCard & { kind: 'cc' }}
      onRemove={onRemove}
      header={header}
      isSelected={isSelected}
    />
  );
}

function AgentFullscreen() {
  const { cards, currentAgentCardId } = useAgentCenterStore();
  const { setIsAgentExpanded } = useLayoutStore();
  const { selectedAgent } = useWorkspaceStore();

  const card = cards.find((c) => c.id === currentAgentCardId);
  // Fallback for new thread/session (no card yet): show blank header with correct agent kind
  const headerCard: AgentCenterCard = card ?? { kind: selectedAgent, id: '' };

  return (
    <div className="flex flex-col h-full min-h-0">
      <CardHeader card={headerCard} onBack={() => setIsAgentExpanded(false)} />
      <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
        <Suspense fallback={null}>
          {selectedAgent === 'codex' ? <ChatInterface /> : <CCView />}
        </Suspense>
      </div>
    </div>
  );
}

function GhostCard() {
  return (
    <button
      onClick={() => void openUrl(PRICING_URL)}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 text-muted-foreground transition-colors hover:border-amber-400/60 hover:bg-amber-50/30 hover:text-amber-600 dark:hover:bg-amber-900/10 min-h-[160px]"
    >
      <div className="flex items-center justify-center rounded-full bg-muted/50 p-3">
        <Lock className="h-4 w-4" />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium">Add more agents</p>
        <p className="mt-0.5 text-[10px] opacity-60">Upgrade to Pro</p>
      </div>
      <div className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-semibold text-white">
        <Plus className="h-3 w-3" />
        Get Pro
      </div>
    </button>
  );
}

type TabFilter = 'all' | 'idle' | 'running';

function AgentGrid() {
  const { cards, removeCard, setCurrentAgentCardId, currentAgentCardId, maxCards } = useAgentCenterStore();
  const { setIsAgentExpanded } = useLayoutStore();
  const { switchToSession, sessionLoadingMap, activeSessionId, setActiveSessionId } = useCCStore();
  const { threadStatusMap, currentThreadId } = useCodexStore();
  const { setSelectedAgent } = useWorkspaceStore();
  const [tab, setTab] = useState<TabFilter>('all');

  const isRunning = (card: AgentCenterCard) =>
    card.kind === 'codex'
      ? threadStatusMap[card.id]?.type === 'active'
      : !!sessionLoadingMap[card.id];

  const counts = useMemo(
    () => ({
      all: cards.length,
      idle: cards.filter((c) => !isRunning(c)).length,
      running: cards.filter((c) => isRunning(c)).length,
    }),
    [cards, threadStatusMap, sessionLoadingMap]
  );

  const visible = tab === 'all' ? cards : cards.filter((c) => (tab === 'running') === isRunning(c));

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

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'idle', label: 'Idle' },
    { key: 'running', label: 'Running' },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b shrink-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${tab === key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
          >
            {key !== 'all' && (
              <span className={`h-1.5 w-1.5 rounded-full ${key === 'running' ? 'bg-green-500' : 'bg-muted-foreground/40'
                }`} />
            )}
            {label}
            <span className={`text-[10px] ${tab === key ? 'opacity-80' : 'opacity-50'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
        <div className="ml-auto">
          <GetProButton />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        {visible.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No {tab} agents.
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {visible.map((card) => (
              <GridCard
                key={card.id}
                card={card}
                onExpand={() => void expand(card)}
                onRemove={() => handleRemove(card)}
                isSelected={card.id === currentAgentCardId}
              />
            ))}
            {tab === 'all' && cards.length >= maxCards && maxCards !== Infinity && (
              <GhostCard />
            )}
          </div>
        )}
      </div>

      {/* Shared composer */}
      <div className="flex justify-center">
        <div className="max-w-3xl w-full px-2">
          <AgentComposer />
        </div>
      </div>
    </div>
  );
}

export default function AgentView() {
  const { isAgentExpanded } = useLayoutStore();
  return isAgentExpanded ? <AgentFullscreen /> : <AgentGrid />;
}
