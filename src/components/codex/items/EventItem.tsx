import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CommandAction, FileUpdateChange } from '@/bindings/v2';
import type { ServerNotification } from '@/bindings';
import { Markdown } from '@/components/Markdown';
import { Check, Copy } from 'lucide-react';
import { TurnPlan } from './TurnPlan';
import { UserMessageItem } from './UserMessageItem';
import { CommandActionItem } from './CommandActionItem';
import { IndividualFileChanges } from './IndividualFileChanges';
import { SummaryFileChanges } from './SummaryFileChanges';
import {
  aggregateFileChanges,
  aggregateTurnChangesFromContext,
  getChangeCounts,
  getDiffViewerProps,
  type RenderEventContext,
} from './fileChangeLogic';

type AgentMessageItemProps = {
  text: string;
};

const AgentMessageItem = ({ text }: AgentMessageItemProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text.length) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!text.length) return null;

  return (
    <div className="group flex flex-col items-start gap-1">
      <div className="flex rounded-md p-2 border w-fit">
        <Markdown value={text} />
      </div>
      <div
        className={`flex items-center gap-1 px-1 transition-opacity ${
          copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        }`}
      >
        <button
          type="button"
          onClick={handleCopy}
          disabled={!text.length}
          aria-label={copied ? 'Copied' : 'Copy message'}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
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
        case 'userMessage':
          return <UserMessageItem content={startedItem.content} />;
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
        case 'userMessage':
        case 'reasoning':
        case 'commandExecution':
          return null;
        case 'fileChange':
          return renderFileChanges(item.changes);

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
    case 'thread/tokenUsage/updated':
    case 'item/reasoning/summaryPartAdded':
    case 'item/reasoning/summaryTextDelta':
    case 'item/fileChange/outputDelta':
    case 'turn/diff/updated':
    case 'rawResponseItem/completed':
    case 'item/commandExecution/outputDelta':
    case 'item/commandExecution/terminalInteraction':
    case 'item/agentMessage/delta':
    case 'turn/started':
    case 'thread/started':
    case 'item/reasoning/textDelta':
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
