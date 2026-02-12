import { useRef, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useCodexStore } from '@/stores/codex';
import { useInputStore } from '@/stores';
import { codexService } from '@/services/codexService';
import { ScrollArea } from '@/components/ui/scroll-area';
import { renderEvent } from './items';
import { ApprovalItem } from './items/ApprovalItem';
import { RequestUserInputItem } from './items/RequestUserInputItem';
import { Markdown } from '@/components/Markdown';
import { Composer } from './Composer';
import { Tips } from '@/components/Tips';
import { CodexAuth } from './CodexAuth';
import type { ServerNotification } from '@/bindings';
import { useSettingsStore } from '@/stores/settings';
import type { GetAccountResponse } from '@/bindings/v2';
import { Quotes } from '../features/Quotes';

export function ChatInterface() {
  const { currentThreadId, currentTurnId, events, inputFocusTrigger } = useCodexStore();
  const { setInputValue } = useInputStore();
  const { taskDetail } = useSettingsStore();
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);

  // Get events for the current thread
  const currentThreadEvents = currentThreadId ? events[currentThreadId] || [] : [];

  // Derive isProcessing from the latest event in the current thread
  let isProcessing = false;
  if (currentThreadEvents.length > 0) {
    const lastEvent = currentThreadEvents[currentThreadEvents.length - 1];
    if (lastEvent.method === 'turn/started') {
      isProcessing = true;
    } else if (lastEvent.method === 'turn/completed' || lastEvent.method === 'error') {
      isProcessing = false;
    } else {
      const turnEvents = currentThreadEvents.filter((e) =>
        ['turn/started', 'turn/completed', 'error'].includes(e.method)
      );
      if (turnEvents.length > 0) {
        const lastTurnEvent = turnEvents[turnEvents.length - 1];
        isProcessing = lastTurnEvent.method === 'turn/started';
      }
    }
  }

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ block: 'end' });
  }, [currentThreadEvents]);

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      try {
        const response = await invoke<GetAccountResponse>('get_account', {
          params: {
            refreshToken: false,
          },
        });
        if (isMounted) {
          setHasAccount(Boolean(response.account));
        }
      } catch (error) {
        console.error('Failed to load account:', error);
        if (isMounted) {
          setHasAccount(false);
        }
      }
    };

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderedEvents: Array<{
    key: string;
    type: 'event' | 'reasoningSummaryDelta';
    event?: ServerNotification;
    text?: string;
    sourceIndex?: number;
  }> = [];
  let pendingSummary: {
    key: string;
    text: string;
    itemId: string;
    summaryIndex: number;
  } | null = null;

  const flushPendingSummary = () => {
    if (pendingSummary) {
      renderedEvents.push({
        key: pendingSummary.key,
        type: 'reasoningSummaryDelta',
        text: pendingSummary.text,
      });
      pendingSummary = null;
    }
  };

  const appendSummaryDelta = (current: string, delta: string) => {
    if (!current) return delta;
    const lastChar = current[current.length - 1];
    const firstChar = delta[0];
    if (/[A-Za-z0-9]$/.test(lastChar) && /^[A-Za-z0-9]/.test(firstChar)) {
      return `${current} ${delta}`;
    }
    return current + delta;
  };

  currentThreadEvents.forEach((event, index) => {
    if (event.method === 'item/reasoning/summaryTextDelta') {
      if (!event.params.delta) return;
      const eventKey = `${event.params.itemId}-${event.params.summaryIndex}`;
      if (
        pendingSummary &&
        pendingSummary.itemId === event.params.itemId &&
        pendingSummary.summaryIndex === event.params.summaryIndex
      ) {
        pendingSummary.text = appendSummaryDelta(pendingSummary.text, event.params.delta);
        return;
      }
      flushPendingSummary();
      pendingSummary = {
        key: `summary-${eventKey}-${index}`,
        text: event.params.delta,
        itemId: event.params.itemId,
        summaryIndex: event.params.summaryIndex,
      };
      return;
    }

    flushPendingSummary();
    renderedEvents.push({
      key: `event-${index}`,
      type: 'event',
      event,
      sourceIndex: index,
    });
  });
  flushPendingSummary();
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full relative">
      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full px-4 pb-32">
          <div className="max-w-3xl mx-auto space-y-2 py-4">
            {renderedEvents.map((entry) =>
              entry.type === 'reasoningSummaryDelta' ? (
                <div key={entry.key} className="inline">
                  {taskDetail !== 'steps' && <Markdown value={entry.text ?? ''} inline />}
                </div>
              ) : (
                <div key={entry.key}>
                  {renderEvent(entry.event as ServerNotification, {
                    events: currentThreadEvents,
                    eventIndex: entry.sourceIndex,
                  })}
                </div>
              )
            )}
            <ApprovalItem />
            {currentThreadEvents.length === 0 && hasAccount === false && <CodexAuth />}
            {currentThreadEvents.length === 0 && hasAccount === true && <Quotes />}
            {isProcessing && (
              <div className="text-sm text-muted-foreground animate-pulse">thinking...</div>
            )}
            {currentThreadEvents.length === 0 && <Tips onTipClick={setInputValue} />}
            <RequestUserInputItem currentThreadId={currentThreadId} />
            <div ref={bottomAnchorRef} aria-hidden="true" />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-background/95 supports-[backdrop-filter]:bg-background/85 backdrop-blur">
        <Composer
          currentThreadId={currentThreadId}
          currentTurnId={currentTurnId}
          isProcessing={isProcessing}
          inputFocusTrigger={inputFocusTrigger}
          onSend={async (message, images) => {
            let targetThreadId = currentThreadId;
            if (!targetThreadId) {
              try {
                const thread = await codexService.threadStart();
                targetThreadId = thread.id;
              } catch (error) {
                console.error('Failed to start thread:', error);
                return;
              }
            }

            await codexService.turnStart(targetThreadId, message, images);
          }}
          onStop={async () => {
            if (!currentThreadId || !currentTurnId) return;
            await codexService.turnInterrupt(currentThreadId, currentTurnId);
          }}
        />
      </div>
    </div>
  );
}
