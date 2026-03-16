import { useRef, useEffect, useState, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCCStore } from '@/stores/ccStore';
import { ccInterrupt, ccResumeSession } from '@/services/tauri/cc';
import { CCMessage } from '@/components/cc/messages';
import { Button } from '@/components/ui/button';
import { Square, RotateCcw } from 'lucide-react';
import type { AgentCenterCard } from '@/stores/useAgentCenterStore';
import type { CCMessage as CCMessageType } from '@/components/cc/types/messages';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

// ─── helpers ────────────────────────────────────────────────────────────────

export function fmtCost(usd: number): string {
  if (usd < 0.001) return '<$0.001';
  return `$${usd.toFixed(3)}`;
}

function fmtTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`;
}

// ─── useCCCardListener ───────────────────────────────────────────────────────
// Listens to cc-message events for a specific session and routes them into
// sessionMessagesMap without requiring CCView to be mounted.

export function useCCCardListener(sessionId: string | null) {
  const { addMessageToSession } = useCCStore();

  useEffect(() => {
    if (!sessionId) return;
    const unlistenPromise = listen<CCMessageType>('cc-message', (event) => {
      const message = event.payload;
      const msgSessionId = (message as CCMessageType & { session_id?: string }).session_id;
      if (!msgSessionId || msgSessionId !== sessionId) return;
      addMessageToSession(sessionId, message);
    });
    return () => { void unlistenPromise.then((fn) => fn()); };
  }, [sessionId, addMessageToSession]);
}

// ─── CCGridCard ──────────────────────────────────────────────────────────────

interface CCGridCardProps {
  card: AgentCenterCard & { kind: 'cc' };
  onExpand: () => void;
  onRemove: () => void;
  header: React.ReactNode;
  isSelected?: boolean;
}

export function CCGridCard({ card, onExpand, onRemove: _onRemove, header, isSelected }: CCGridCardProps) {
  const { sessionMessagesMap, sessionLoadingMap, activeSessionIds, addActiveSessionId, setSessionLoading, options } = useCCStore();
  const { cwd } = useWorkspaceStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Tracks the full resume phase: API call + history replay
  const [isResumingSession, setIsResumingSession] = useState(false);

  useCCCardListener(card.id);

  const messages = sessionMessagesMap[card.id] ?? [];
  const processing = sessionLoadingMap[card.id] ?? false;
  const needsResume = !activeSessionIds.includes(card.id) && messages.length === 0 && !processing;

  const hasPending = messages.some((m) => m.type === 'permission_request' && !m.resolved);

  const tokens = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === 'result') {
        const u = (m as any).usage;
        if (u) return (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
      }
    }
    return null;
  }, [messages]);

  const cost: number | null = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.type === 'result') {
        const c = (m as any).total_cost_usd;
        if (typeof c === 'number') return c;
      }
    }
    return null;
  }, [messages]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleStop = async () => {
    await ccInterrupt(card.id);
  };

  const handleResume = async () => {
    setIsResumingSession(true);
    try {
      await ccResumeSession(card.id, {
        cwd,
        permissionMode: options.permissionMode,
        resume: card.id,
        continueConversation: true,
        ...(options.model ? { model: options.model } : {}),
      });
      addActiveSessionId(card.id);
      // History replay is synchronous in the backend and all cc-message events are
      // emitted before the command returns. Reset loading state so an interrupted
      // session (no result message) doesn't leave the card stuck in "processing".
      setSessionLoading(card.id, false);
    } finally {
      setIsResumingSession(false);
    }
  };

  const attentionBorder = hasPending
    ? 'ring-2 ring-amber-500/70 border-amber-500/30'
    : isSelected
    ? 'ring-2 ring-primary/60 border-primary/30'
    : 'border';

  return (
    <div className={`flex flex-col ${attentionBorder} rounded-lg bg-background overflow-hidden h-72 transition-shadow`}>
      {header}

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin] cursor-pointer"
        onClick={onExpand}
      >
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-1 p-3">
            {messages.map((msg, i) => (
              <CCMessage key={i} message={msg} index={i} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 py-1 border-t bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono tabular-nums ${processing && !isResumingSession ? 'text-green-500' : 'text-muted-foreground/50'}`}
          >
            {processing && !isResumingSession
              ? fmtElapsed(elapsed)
              : isResumingSession
              ? 'loading…'
              : needsResume
              ? 'not loaded'
              : 'idle'}
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
        {processing && !isResumingSession && (
          <Button size="icon" variant="destructive" className="h-6 w-6" onClick={handleStop}>
            <Square className="h-3 w-3" />
          </Button>
        )}
        {needsResume && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[10px] gap-1"
            disabled={isResumingSession}
            onClick={(e) => { e.stopPropagation(); void handleResume(); }}
          >
            <RotateCcw className={`h-3 w-3 ${isResumingSession ? 'animate-spin' : ''}`} />
            {isResumingSession ? 'Loading…' : 'Resume'}
          </Button>
        )}
      </div>
    </div>
  );
}
