import { lazy, Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { useLayoutStore, useAgentCenterStore } from '@/stores';
import { useCodexStore } from '@/stores/codex';
import { useApprovalStore, useRequestUserInputStore } from '@/stores/codex';
import { useCCStore } from '@/stores/ccStore';

import { codexService } from '@/services/codexService';
import { ccInterrupt } from '@/services/tauri/cc';
import { renderEvent } from '@/components/codex/items';
import { CCMessage } from '@/components/cc/messages';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X, Square } from 'lucide-react';
import type { AgentCenterCard } from '@/stores/useAgentCenterStore';
import type { ServerNotification } from '@/bindings';
import { AgentIcon } from '@/components/common/AgentIcon';

const ChatInterface = lazy(() =>
  import('@/components/codex/ChatInterface').then((m) => ({ default: m.ChatInterface }))
);
const CCView = lazy(() => import('@/components/cc/CCView'));

// ─── helpers ────────────────────────────────────────────────────────────────

function isCodexProcessing(events: ServerNotification[]): boolean {
  for (let i = events.length - 1; i >= 0; i--) {
    const m = events[i].method;
    if (m === 'turn/started') return true;
    if (m === 'turn/completed' || m === 'error') return false;
  }
  return false;
}

function getCodexActiveTurnId(events: ServerNotification[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.method === 'turn/started') return (e.params as { turn: { id: string } }).turn.id;
    if (e.method === 'turn/completed' || e.method === 'error') return null;
  }
  return null;
}

function getCodexTokens(events: ServerNotification[]): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.method === 'thread/tokenUsage/updated') {
      const total = (e.params as any).tokenUsage?.total?.totalTokens;
      return typeof total === 'number' ? total : null;
    }
  }
  return null;
}

function getCodexContextWindow(
  events: ServerNotification[]
): { used: number; window: number } | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.method === 'thread/tokenUsage/updated') {
      const tu = (e.params as any).tokenUsage;
      const used = tu?.total?.totalTokens;
      const win = tu?.modelContextWindow;
      if (typeof used === 'number' && typeof win === 'number' && win > 0) {
        return { used, window: win };
      }
      return null;
    }
  }
  return null;
}

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`;
}

function fmtCost(usd: number): string {
  if (usd < 0.001) return '<$0.001';
  return `$${usd.toFixed(3)}`;
}

// ─── ContextWindowBar ────────────────────────────────────────────────────────

function ContextWindowBar({ used, window: win }: { used: number; window: number }) {
  const pct = Math.min(used / win, 1);
  const color =
    pct > 0.85 ? 'bg-red-500' : pct > 0.65 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="h-0.5 w-full bg-muted/30 shrink-0">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

// ─── CardHeader ─────────────────────────────────────────────────────────────

interface CardHeaderProps {
  card: AgentCenterCard;
  onClose?: () => void;
  onBack?: () => void;
}

function CardHeader({ card, onClose, onBack }: CardHeaderProps) {
  const title = card.preview?.slice(0, 60) || card.id.slice(0, 12);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/30 shrink-0">
      {onBack && (
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      )}
      {onClose && (
        <button
          onClick={onClose}
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

// ─── GridCard ────────────────────────────────────────────────────────────────

interface GridCardProps {
  card: AgentCenterCard;
  onExpand: () => void;
  onRemove: () => void;
}

function GridCard({ card, onExpand, onRemove }: GridCardProps) {
  const { events } = useCodexStore();
  const { sessionMessagesMap, activeSessionId, isLoading } = useCCStore();
  const { pendingApprovals } = useApprovalStore();
  const { pendingRequests } = useRequestUserInputStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const threadEvents = card.kind === 'codex' ? (events[card.id] ?? []) : [];
  const messages = card.kind === 'cc' ? (sessionMessagesMap[card.id] ?? []) : [];

  const processing =
    card.kind === 'codex'
      ? isCodexProcessing(threadEvents)
      : isLoading && activeSessionId === card.id;

  // Attention: any pending action requires user input
  const hasPending =
    card.kind === 'codex'
      ? pendingApprovals.some((a) => (a as any).threadId === card.id) ||
      pendingRequests.some((r) => r.threadId === card.id)
      : messages.some((m) => m.type === 'permission_request' && !m.resolved);

  // Token info
  const tokens =
    card.kind === 'codex'
      ? getCodexTokens(threadEvents)
      : (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.type === 'result') {
            const u = (m as any).usage;
            if (u) return (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
          }
        }
        return null;
      })();

  // Context window
  const ctxWindow = card.kind === 'codex' ? getCodexContextWindow(threadEvents) : null;

  // Cost (CC only)
  const cost: number | null = useMemo(() => {
    if (card.kind !== 'cc') return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === 'result') {
        const c = (m as any).total_cost_usd;
        if (typeof c === 'number') return c;
      }
    }
    return null;
  }, [card.kind, messages]);

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);
  const processingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (processing) {
      if (processingStartRef.current === null) {
        processingStartRef.current = Date.now();
      }
      const id = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (processingStartRef.current ?? Date.now())) / 1000));
      }, 1000);
      return () => clearInterval(id);
    } else {
      processingStartRef.current = null;
      setElapsed(0);
    }
  }, [processing]);

  // Auto-scroll body
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [threadEvents.length, messages.length]);

  const handleStop = async () => {
    if (card.kind === 'codex') {
      const turnId = getCodexActiveTurnId(threadEvents);
      if (turnId) await codexService.turnInterrupt(card.id, turnId);
    } else {
      await ccInterrupt(card.id);
    }
  };

  const codexItems = useMemo(
    () =>
      threadEvents
        .map((event, i) => {
          const rendered = renderEvent(event, { events: threadEvents, eventIndex: i });
          return rendered ? <div key={i}>{rendered}</div> : null;
        })
        .filter(Boolean),
    [threadEvents]
  );

  const attentionBorder = hasPending
    ? 'ring-2 ring-amber-500/70 border-amber-500/30'
    : 'border';

  return (
    <div className={`flex flex-col ${attentionBorder} rounded-lg bg-background overflow-hidden h-72 transition-shadow`}>
      <CardHeader card={card} onClose={onRemove} />

      {/* body — click to expand */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] cursor-pointer"
        onClick={onExpand}
      >
        {card.kind === 'codex' ? (
          codexItems.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">No messages yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5 p-3">{codexItems}</div>
          )
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-1 p-3">
            {messages.map((msg, i) => (
              <CCMessage key={i} message={msg} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* context window usage bar */}
      {ctxWindow && <ContextWindowBar used={ctxWindow.used} window={ctxWindow.window} />}

      {/* status footer */}
      <div className="flex items-center justify-between px-2 py-1 border-t bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono tabular-nums ${processing ? 'text-green-500' : 'text-muted-foreground/50'
              }`}
          >
            {processing ? fmtElapsed(elapsed) : 'idle'}
          </span>
          {tokens !== null && (
            <span className="text-[10px] text-muted-foreground/40">{fmtTokens(tokens)} tok</span>
          )}
          {cost !== null && (
            <span className="text-[10px] text-muted-foreground/40">{fmtCost(cost)}</span>
          )}
          {hasPending && !processing && (
            <span className="text-[10px] text-amber-500 animate-pulse">needs input</span>
          )}
        </div>
        {processing && (
          <Button size="icon" variant="destructive" className="h-6 w-6" onClick={handleStop}>
            <Square className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── AgentView ───────────────────────────────────────────────────────────────

type TabFilter = 'all' | 'idle' | 'running';

export default function AgentView() {
  const { cards, removeCard } = useAgentCenterStore();
  const { currentCard, setCurrentAgentCard } = useLayoutStore();
  const { switchToSession } = useCCStore();
  const { events } = useCodexStore();
  const { activeSessionId, isLoading } = useCCStore();
  const [tab, setTab] = useState<TabFilter>('all');

  const isRunning = (card: AgentCenterCard) =>
    card.kind === 'codex'
      ? isCodexProcessing(events[card.id] ?? [])
      : isLoading && activeSessionId === card.id;

  const counts = useMemo(
    () => ({
      all: cards.length,
      idle: cards.filter((c) => !isRunning(c)).length,
      running: cards.filter((c) => isRunning(c)).length,
    }),
    [cards, events, activeSessionId, isLoading]
  );

  const visible = tab === 'all' ? cards : cards.filter((c) => (tab === 'running') === isRunning(c));

  const expand = async (card: AgentCenterCard) => {
    setCurrentAgentCard({ kind: card.kind, id: card.id });
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
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors ${tab === key
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
