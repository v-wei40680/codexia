import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CommandAction } from '@/bindings/v2';
import { CommandActionItem } from './CommandActionItem';

type Props = {
  actions: CommandAction[];
};

export const CommandActionSummaryItem = ({ actions }: Props) => {
  const [expanded, setExpanded] = useState(false);

  const reads = actions.filter((a) => a.type === 'read').length;
  const commands = actions.filter((a) => a.type === 'unknown').length;
  const lists = actions.filter((a) => a.type === 'listFiles').length;
  const searches = actions.filter((a) => a.type === 'search').length;

  const parts: string[] = [];
  if (reads > 0) parts.push(`Read ${reads} ${reads === 1 ? 'file' : 'files'}`);
  if (commands > 0) parts.push(`Ran ${commands} ${commands === 1 ? 'command' : 'commands'}`);
  if (lists > 0) parts.push(`Listed ${lists} ${lists === 1 ? 'folder' : 'folders'}`);
  if (searches > 0) parts.push(`Searched ${searches} ${searches === 1 ? 'time' : 'times'}`);

  if (parts.length === 0) return null;

  return (
    <div className="text-xs text-muted-foreground">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer py-0.5"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        {parts.join(', ')}
      </button>

      {expanded && (
        <div className="mt-1 ml-4 space-y-1 border-l pl-3 border-border/50">
          {actions.map((action, i) => (
            <CommandActionItem key={i} action={action} />
          ))}
        </div>
      )}
    </div>
  );
};
