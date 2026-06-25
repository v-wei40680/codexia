import { useRef, useEffect, useState, type ReactNode } from 'react';
import { useCodexStore } from '@/stores/codex';
import { useIsProcessing } from '@/hooks/codex';
import { ScrollArea } from '@/components/ui/scroll-area';
import { renderEvent } from './items';
import { ApprovalItem } from './items/ApprovalItem';
import { RequestUserInputItem } from './items/RequestUserInputItem';
import { Composer } from './Composer';
import { CodexAuth } from './CodexAuth';
import { codexService } from '@/services/codexService';
import { Button } from '@/components/ui/button';

export function CodexThread({ hideComposer = false }: { hideComposer?: boolean } = {}) {
  const { currentThreadId, events, hasAccount, activeThreadIds } = useCodexStore();
  const isLive = !!currentThreadId && activeThreadIds.includes(currentThreadId);
  const isProcessing = useIsProcessing();
  const bottomAnchorRef = useRef<HTMLDivElement>(null);

  // Get events for the current thread
  const currentThreadEvents = currentThreadId ? events[currentThreadId] || [] : [];

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ block: 'end' });
  }, [currentThreadEvents]);

  const renderedEvents: Array<{
    key: string;
    type: 'event';
    content?: ReactNode;
  }> = [];
  const seenAgentMessageDeltaItemIds = new Set<string>();

  currentThreadEvents.forEach((event, index) => {
    if (event.method === 'item/agentMessage/delta') {
      seenAgentMessageDeltaItemIds.add(event.params.itemId);
    }

    if (event.method === 'item/completed') {
      const completedItem = event.params.item;

      if (
        completedItem.type === 'agentMessage' &&
        seenAgentMessageDeltaItemIds.has(completedItem.id)
      ) {
        return;
      }
    }

    const rendered = renderEvent(event, {
      events: currentThreadEvents,
      eventIndex: index,
    });
    if (rendered === null) {
      return;
    }
    renderedEvents.push({
      key: `event-${index}`,
      type: 'event',
      content: rendered,
    });
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full relative">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className={`h-full px-4 ${hideComposer ? '' : 'pb-32'}`}>
          <div className="max-w-3xl mx-auto space-y-2 py-4">
            {renderedEvents.map((entry) => (
              <div key={entry.key}>{entry.content}</div>
            ))}
            <ApprovalItem />
            {currentThreadEvents.length === 0 && hasAccount === false && <CodexAuth />}
            {isProcessing && (
              <div className="text-sm text-muted-foreground animate-pulse">Thinking</div>
            )}
            <RequestUserInputItem currentThreadId={currentThreadId} />
            <div ref={bottomAnchorRef} aria-hidden="true" />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      {!hideComposer && (
        <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-0 max-w-3xl mx-auto">
          {currentThreadId && !isLive ? (
            <ResumeThreadButton threadId={currentThreadId} />
          ) : (
            <Composer />
          )}
        </div>
      )}
    </div>
  );
}

function ResumeThreadButton({ threadId }: { threadId: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    setBusy(true);
    try {
      await codexService.threadResume(threadId);
    } catch (err) {
      console.error('[ResumeThreadButton] threadResume failed:', err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 p-4 mb-2 rounded-lg border border-border bg-muted/40 text-sm">
      <span className="text-muted-foreground">
        Reviewing history. Resume to send messages.
      </span>
      <Button onClick={onClick} disabled={busy} size="sm">
        {busy ? 'Resuming…' : 'Resume session'}
      </Button>
    </div>
  );
}
