import { lazy, Suspense, useState, useMemo } from 'react';
import { useAgentCenterStore } from '@/stores';
import { useLayoutStore } from '@/stores';
import { useCodexStore } from '@/stores/codex';
import { useCCStore } from '@/stores/ccStore';

import { codexService } from '@/services/codexService';
import { ArrowLeft, X } from 'lucide-react';
import type { AgentCenterCard } from '@/stores/useAgentCenterStore';
import { AgentIcon } from '@/components/common/AgentIcon';
import { AgentComposer } from '@/components/common';
import { CodexGridCard } from './CodexGridCard';
import { CCGridCard } from './CCGridCard';

const ChatInterface = lazy(() =>
  import('@/components/codex/ChatInterface').then((m) => ({ default: m.ChatInterface }))
);
const CCView = lazy(() => import('@/components/cc/CCView'));

// ─── CardHeader ──────────────────────────────────────────────────────────────

interface CardHeaderProps {
  card: AgentCenterCard;
  onClose?: () => void;
  onBack?: () => void;
  onSelect?: () => void;
}

export function CardHeader({ card, onClose, onBack, onSelect }: CardHeaderProps) {
  const title = card.preview?.slice(0, 60) || card.id.slice(0, 12);

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
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-destructive/60 hover:text-destructive transition-colors shrink-0"
          aria-label="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <AgentIcon agent={card.kind} />
      <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{title}</span>
    </div>
  );
}

// ─── GridCard ─────────────────────────────────────────────────────────────────

interface GridCardProps {
  card: AgentCenterCard;
  onExpand: () => void;
  onRemove: () => void;
  isSelected: boolean;
}

function GridCard({ card, onExpand, onRemove, isSelected }: GridCardProps) {
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const header = (
    <CardHeader
      card={card}
      onClose={onRemove}
      onSelect={() => setCurrentAgentCardId(card.id)}
    />
  );

  if (card.kind === 'codex') {
    return (
      <CodexGridCard
        card={card as AgentCenterCard & { kind: 'codex' }}
        onExpand={onExpand}
        onRemove={onRemove}
        header={header}
        isSelected={isSelected}
      />
    );
  }

  return (
    <CCGridCard
      card={card as AgentCenterCard & { kind: 'cc' }}
      onExpand={onExpand}
      onRemove={onRemove}
      header={header}
      isSelected={isSelected}
    />
  );
}

// ─── AgentView ────────────────────────────────────────────────────────────────

type TabFilter = 'all' | 'idle' | 'running';

export default function AgentView() {
  const { cards, removeCard, setCurrentAgentCardId, currentAgentCardId } = useAgentCenterStore();
  const { currentCard, setCurrentAgentCard } = useLayoutStore();
  const { switchToSession, sessionLoadingMap } = useCCStore();
  const { threadLoadingMap, currentThreadId, currentTurnId } = useCodexStore();
  const [tab, setTab] = useState<TabFilter>('all');
  const [codexSending, setCodexSending] = useState(false);

  const isRunning = (card: AgentCenterCard) =>
    card.kind === 'codex'
      ? !!threadLoadingMap[card.id]
      : !!sessionLoadingMap[card.id];

  const counts = useMemo(
    () => ({
      all: cards.length,
      idle: cards.filter((c) => !isRunning(c)).length,
      running: cards.filter((c) => isRunning(c)).length,
    }),
    [cards, threadLoadingMap, sessionLoadingMap]
  );

  const visible = tab === 'all' ? cards : cards.filter((c) => (tab === 'running') === isRunning(c));

  const expand = async (card: AgentCenterCard) => {
    setCurrentAgentCard({ kind: card.kind, id: card.id });
    setCurrentAgentCardId(card.id);
    if (card.kind === 'codex') {
      await codexService.setCurrentThread(card.id);
    } else {
      switchToSession(card.id);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No agents open. Click a thread or session in the sidebar.
      </div>
    );
  }

  // Full-screen mode
  if (currentCard) {
    const card = cards.find((c) => c.kind === currentCard.kind && c.id === currentCard.id);
    return (
      <div className="flex flex-col h-full min-h-0">
        <CardHeader card={card ?? currentCard} onBack={() => setCurrentAgentCard(null)} />
        <div className="flex flex-col flex-1 min-h-0">
          <Suspense fallback={null}>
            {currentCard.kind === 'codex' ? <ChatInterface /> : <CCView />}
          </Suspense>
        </div>
      </div>
    );
  }

  // Grid mode
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {label}
            <span className={`text-[10px] ${tab === key ? 'opacity-80' : 'opacity-50'}`}>
              {counts[key]}
            </span>
          </button>
        ))}
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
                onRemove={() => removeCard(card)}
                isSelected={card.id === currentAgentCardId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Shared composer */}
      <AgentComposer
        isProcessing={codexSending}
        onStop={async () => {
          if (!currentThreadId || !currentTurnId) return;
          await codexService.turnInterrupt(currentThreadId, currentTurnId);
          setCodexSending(false);
        }}
      />
    </div>
  );
}
