import { useEffect, useRef, useState } from 'react';
import { save } from '@tauri-apps/plugin-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommandAction, FileUpdateChange } from '@/bindings/v2';
import type { ServerNotification } from '@/bindings';
import { Markdown } from '@/components/Markdown';
import { Brain, Check, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import { TurnPlan } from './TurnPlan';
import { EditableUserMessageItem } from './UserMessageItem';
import { AgentMessageItem } from './AgentMessageItem';
import { CommandActionItem } from './CommandActionItem';
import { IndividualFileChanges } from './IndividualFileChanges';
import { SummaryFileChanges } from './SummaryFileChanges';
import { writeFile } from '@/services';
import { isTauri } from '@/hooks/runtime';
import {
  aggregateFileChanges,
  aggregateTurnChangesFromContext,
  getChangeCounts,
  getDiffViewerProps,
  type RenderEventContext,
} from './fileChangeLogic';

type PlanContentItemProps = {
  text: string;
};

const PlanContentItem = ({ text }: PlanContentItemProps) => {
  const [collapsed, setCollapsed] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!text.length) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error('Failed to copy plan text:', error);
    }
  };

  const handleDownload = async () => {
    if (!text.length || !isTauri()) return;

    try {
      const filePath = await save({
        defaultPath: 'plan.md',
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });
      if (!filePath) return;
      await writeFile(filePath, text);
    } catch (error) {
      console.error('Failed to save plan file:', error);
    }
  };

  if (!text.length) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-md border bg-accent/40">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">Plan</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void handleDownload()}
              disabled={!text.length || !isTauri()}
              aria-label="Download plan"
              title="Download plan.md"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => void handleCopy()}
              disabled={!text.length}
              aria-label={copied ? 'Copied' : 'Copy plan'}
              title={copied ? 'Copied' : 'Copy plan'}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setCollapsed((prev) => !prev)}
              aria-label={collapsed ? 'Expand plan content' : 'Collapse plan content'}
              title={collapsed ? 'Expand plan content' : 'Collapse plan content'}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        <div className={`overflow-hidden p-2 ${collapsed ? 'max-h-64' : 'max-h-[1200px]'}`}>
          <Markdown value={text} />
        </div>
      </div>
      {collapsed ? (
        <Button size="xs" onClick={() => setCollapsed(false)}>
          Expand plan
        </Button>
      ) : null}
    </div>
  );
};

const getRollbackTurnsForTurn = (
  context: RenderEventContext | undefined,
  turnId: string
): number => {
  const events = context?.events;
  const eventIndex = context?.eventIndex;
  if (!events || eventIndex === undefined || eventIndex < 0) return 1;

  const laterTurnIds = new Set<string>();
  for (let i = eventIndex + 1; i < events.length; i += 1) {
    const candidate = events[i];
    let candidateTurnId: string | undefined;

    if (
      (candidate.method === 'item/started' || candidate.method === 'item/completed') &&
      candidate.params?.turnId
    ) {
      candidateTurnId = candidate.params.turnId;
    } else if (candidate.method === 'turn/completed') {
      candidateTurnId = candidate.params?.turn?.id;
    }

    if (candidateTurnId && candidateTurnId !== turnId) {
      laterTurnIds.add(candidateTurnId);
    }
  }

  // Edit should remove the selected turn itself plus all later turns.
  return laterTurnIds.size + 1;
};

export const renderEvent = (event: ServerNotification, context?: RenderEventContext) => {
  const fileChangeMap = {
    add: 'Created',
    delete: 'Deleted',
    update: 'Edited',
  };

  const renderFileChanges = (changes: FileUpdateChange[]) => (
    <IndividualFileChanges
      changes={changes}
      fileChangeMap={fileChangeMap}
      getChangeCounts={getChangeCounts}
      getDiffViewerProps={getDiffViewerProps}
    />
  );
  switch (event.method) {
    case 'error':
      return <Badge>{event.params.error.message}</Badge>;
    case 'item/started':
      let { item: startedItem } = event.params;
      switch (startedItem.type) {
        case 'userMessage': {
          const threadId = event.params.threadId;
          const turnId = event.params.turnId;
          const rollbackTurns = getRollbackTurnsForTurn(context, turnId);

          return (
            <EditableUserMessageItem
              content={startedItem.content}
              threadId={threadId}
              rollbackTurns={rollbackTurns}
            />
          );
        }
        case 'commandExecution':
          return (
            <div>
              {startedItem.commandActions.map((a: CommandAction, i) => (
                <CommandActionItem key={i} action={a} />
              ))}
            </div>
          );
        case 'reasoning':
        case 'agentMessage':
        case 'enteredReviewMode':
        case 'fileChange':
          return null;
        default:
          return null;
      }
    case 'item/completed':
      let { item } = event.params;
      switch (item.type) {
        case 'agentMessage':
          return <AgentMessageItem text={item.text} />;
        case 'reasoning':
          if (item.summary.length > 0) {
            return <span className='flex items-center gap-2'><Brain className='h-4 w-4' />
              <Markdown value={item.summary.join('')} />
            </span>;
          }
          return null;
        case 'userMessage':
        case 'commandExecution':
          return null;
        case 'fileChange':
          return renderFileChanges(item.changes);
        case 'plan':
          return <PlanContentItem text={item.text} />
        case 'enteredReviewMode':
        case 'exitedReviewMode':
          return null;
        default:
          return (
            <div>
              <pre>{JSON.stringify(item, null, 2)}</pre>
              <Badge variant="destructive">{item.type}</Badge>
            </div>
          );
      }
    case 'turn/completed':
      if (event.params.turn.status === 'interrupted') {
        return (
          <div>
            <Badge variant="destructive">{event.params.turn.status}</Badge>
          </div>
        );
      }

      const fileChangeItems = event.params.turn.items.filter(
        (turnItem): turnItem is Extract<typeof turnItem, { type: 'fileChange' }> =>
          turnItem.type === 'fileChange' && turnItem.changes.length > 0
      );

      const aggregatedChanges =
        fileChangeItems.length > 0
          ? aggregateFileChanges(fileChangeItems.flatMap((it) => it.changes))
          : aggregateTurnChangesFromContext(event.params.turn.id, context);

      if (aggregatedChanges.length === 0) return null;

      return (
        <div className="space-y-2">
          <SummaryFileChanges changes={aggregatedChanges} getDiffViewerProps={getDiffViewerProps} />
        </div>
      );
    case 'turn/plan/updated':
      return <TurnPlan plan={event.params.plan} explanation={event.params.explanation} />;
    case 'item/agentMessage/delta':
      return <AgentMessageItem text={event.params.delta} />;
    case 'item/plan/delta':
      return <PlanContentItem text={event.params.delta} />;
    case 'item/reasoning/textDelta':
      return (
        <div className="rounded-md border border-muted bg-muted/20 px-2 py-1 text-sm text-muted-foreground">
          <Markdown value={event.params.delta} />
        </div>
      );
    case 'item/fileChange/outputDelta':
      return null
    case 'item/commandExecution/terminalInteraction':
      return (
        <div className="rounded-md border border-slate-300/80 bg-slate-100/40 px-2 py-1 text-xs text-slate-700">
          <span className="mr-2 font-medium">terminal input</span>
          <code className="whitespace-pre-wrap break-all">{event.params.stdin}</code>
        </div>
      );
    case 'thread/tokenUsage/updated':
    case 'item/reasoning/summaryPartAdded':
    case 'item/reasoning/summaryTextDelta':
    case 'turn/diff/updated':
    case 'rawResponseItem/completed':
    case 'item/commandExecution/outputDelta':
    case 'turn/started':
    case 'thread/started':
      return null;

    default:
      return (
        <>
          <pre className="max-h-64 overflow-auto">
            <code>{JSON.stringify(event.params, null, 2)}</code>
          </pre>
          <Badge>{event.method}</Badge>
        </>
      );
  }
};
