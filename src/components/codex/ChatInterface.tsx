import { useRef, useEffect, useState, type ReactNode } from 'react';
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
import { useSettingsStore } from '@/stores/settings';
import { Quotes } from '../features/Quotes';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/utils/errorUtils';
import { getAccountWithParams } from '@/services';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ProjectSelector } from '@/components/project-selector/ProjectSelector';
import { Button } from '@/components/ui/button';
import { CircleHelp, Lightbulb } from 'lucide-react';

export function ChatInterface() {
  const { currentThreadId, currentTurnId, events, inputFocusTrigger } = useCodexStore();
  const { setInputValue } = useInputStore();
  const { taskDetail } = useSettingsStore();
  const { projects } = useWorkspaceStore();
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [showQuotes, setShowQuotes] = useState(true);
  const [showTips, setShowTips] = useState(true);

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
        const response = await getAccountWithParams({
          refreshToken: false,
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

  const isEmptyConversation = currentThreadEvents.length === 0;
  const showWorkspaceLauncher = isEmptyConversation && hasAccount === true && projects.length > 0;

  const renderedEvents: Array<{
    key: string;
    type: 'event' | 'reasoningSummaryDelta';
    content?: ReactNode;
    text?: string;
  }> = [];
  let pendingSummary: {
    key: string;
    text: string;
    itemId: string;
    summaryIndex: number;
  } | null = null;
  const seenAgentMessageDeltaItemIds = new Set<string>();
  const seenPlanDeltaItemIds = new Set<string>();
  const seenReasoningTextDeltaItemIds = new Set<string>();
  const seenReasoningSummaryDeltaItemIds = new Set<string>();

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
    if (event.method === 'item/agentMessage/delta') {
      seenAgentMessageDeltaItemIds.add(event.params.itemId);
    } else if (event.method === 'item/plan/delta') {
      seenPlanDeltaItemIds.add(event.params.itemId);
    } else if (event.method === 'item/reasoning/textDelta') {
      seenReasoningTextDeltaItemIds.add(event.params.itemId);
    }

    if (event.method === 'item/reasoning/summaryTextDelta') {
      seenReasoningSummaryDeltaItemIds.add(event.params.itemId);
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

    if (event.method === 'item/completed') {
      const completedItem = event.params.item;

      if (
        completedItem.type === 'agentMessage' &&
        seenAgentMessageDeltaItemIds.has(completedItem.id)
      ) {
        return;
      }

      if (completedItem.type === 'plan' && seenPlanDeltaItemIds.has(completedItem.id)) {
        return;
      }

      if (completedItem.type === 'reasoning') {
        const hasReasoningTextDelta = seenReasoningTextDeltaItemIds.has(completedItem.id);
        const hasVisibleReasoningSummaryDelta =
          taskDetail !== 'steps' && seenReasoningSummaryDeltaItemIds.has(completedItem.id);

        if (hasReasoningTextDelta || hasVisibleReasoningSummaryDelta) {
          return;
        }
      }
    }

    flushPendingSummary();
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
                <div key={entry.key}>{entry.content}</div>
              )
            )}
            <ApprovalItem />
            {currentThreadEvents.length === 0 && hasAccount === false && <CodexAuth />}
            {showWorkspaceLauncher && (
              <div className="mx-auto my-8 flex w-full max-w-3xl flex-col items-center gap-3 px-4 text-center">
                <p className="text-2xl font-semibold tracking-tight">let&apos;s build</p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={showQuotes ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setShowQuotes((prev) => !prev)}
                    title={showQuotes ? 'Hide quotes' : 'Show quotes'}
                    aria-label={showQuotes ? 'Hide quotes' : 'Show quotes'}
                    aria-pressed={showQuotes}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                  <ProjectSelector
                    variant="hero"
                    className="h-10 max-w-[220px] gap-2 px-3"
                    triggerMode="project-name"
                    showChevron
                  />
                  <Button
                    type="button"
                    variant={showTips ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setShowTips((prev) => !prev)}
                    title={showTips ? 'Hide tips' : 'Show tips'}
                    aria-label={showTips ? 'Hide tips' : 'Show tips'}
                    aria-pressed={showTips}
                  >
                    <CircleHelp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {currentThreadEvents.length === 0 && hasAccount === true && showQuotes && <Quotes />}
            {isProcessing && (
              <div className="text-sm text-muted-foreground animate-pulse">thinking...</div>
            )}
            {currentThreadEvents.length === 0 && showTips && <Tips onTipClick={setInputValue} />}
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
                toast.error('Failed to start thread', {
                  description: getErrorMessage(error),
                });
                return;
              }
            }
            try {
              await codexService.turnStart(targetThreadId, message, images);
            } catch (error) {
              console.error('Failed to send message:', error);
              toast.error('Failed to send message', {
                description: getErrorMessage(error),
              });
            }
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
