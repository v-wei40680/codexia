import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/Markdown';
import { CommandAction, FileUpdateChange } from '@/bindings/v2';
import type { ServerNotification } from '@/bindings';
import { TurnPlan } from './TurnPlan';
import { DiffViewer } from '../../features/DiffViewer';
import { UserMessageItem } from './UserMessageItem';
import { getFilename } from '@/utils/getFilename';
import { ChevronRight } from 'lucide-react';
import { getDiffCounts } from '@/utils/diff';
import { CommandActionItem } from './CommandActionItem';
import { useState } from 'react';

export const renderEvent = (event: ServerNotification) => {
  const fileChangeMap = {
    add: 'Created',
    delete: 'Deleted',
    update: 'Edited',
  };

  const renderFileChanges = (changes: FileUpdateChange[]) => (
    <FileChanges changes={changes} fileChangeMap={fileChangeMap} />
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
          return (
            item.text.length > 0 && (
              <div className="flex rounded-md p-2 border w-fit">
                <Markdown value={item.text} />
              </div>
            )
          );
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

      if (fileChangeItems.length === 0) return null;

      return (
        <div>
          <div className="flex border rounded-md p-2">{fileChangeItems.length} file changes</div>
          {fileChangeItems.map((fileChangeItem) => (
            <div key={fileChangeItem.id}>
              {fileChangeItem.changes.map((c) => (
                <DiffViewer unifiedDiff={c.diff} className="mt-2 max-h-64" />
              ))}
            </div>
          ))}
        </div>
      );
    case 'turn/plan/updated':
      return <TurnPlan plan={event.params.plan} explanation={event.params.explanation} />;
    case 'thread/tokenUsage/updated':
    case 'item/reasoning/summaryPartAdded':
    case 'item/reasoning/summaryTextDelta':
    case 'item/fileChange/outputDelta':
      return null;
    case 'turn/diff/updated': {
      return <DiffViewer unifiedDiff={event.params.diff} className="max-h-64" />;
    }
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

const FileChanges = ({
  changes,
  fileChangeMap,
}: {
  changes: FileUpdateChange[];
  fileChangeMap: Record<FileUpdateChange['kind']['type'], string>;
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div>
      {changes.map((c, i) => {
        const key = `${c.path}-${i}`;
        const isExpanded = expandedKeys.has(key);

        return (
          <div key={key}>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="h-auto px-1 text-sm" onClick={() => toggle(key)}>
                {fileChangeMap[c.kind.type]}
              </Button>
              <Markdown value={`[${getFilename(c.path)}](${c.path})`} />
              <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {(() => {
                  const { addedCount, removedCount } = getDiffCounts({
                    unifiedDiff: c.diff,
                    diffLines: [],
                  });
                  return (
                    <>
                      <span className="text-green-600 dark:text-green-400">+{addedCount}</span>
                      <span className="text-red-600 dark:text-red-400">-{removedCount}</span>
                    </>
                  );
                })()}
              </span>
              <Button size="icon" variant="ghost" onClick={() => toggle(key)}>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </Button>
            </div>
            {isExpanded && <DiffViewer unifiedDiff={c.diff} className="mt-2 max-h-64" />}
          </div>
        );
      })}
    </div>
  );
};
