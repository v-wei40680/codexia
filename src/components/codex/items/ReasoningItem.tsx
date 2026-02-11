import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Markdown } from '@/components/Markdown';
import { Streamdown } from 'streamdown';

export const ReasoningItem = ({
  item,
}: {
  item: {
    type: 'reasoning';
    id: string;
    summary: Array<string>;
    content: Array<string>;
  };
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const content =
    item.content?.length > 0
      ? item.content.join('')
      : item.summary?.length > 0
        ? item.summary.join('')
        : '';
  const lines = content.split('\n');
  const preview = lines[0] ?? '';
  const restContent = lines.slice(1).join('\n').trim();

  if (!content) return null;

  return (
    <div className="flex flex-col gap-1 w-full border-muted my-2">
      <div
        className="flex items-center gap-2 cursor-pointer hover:text-foreground text-muted-foreground transition-colors group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted transition-colors">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="text-sm font-medium flex items-center gap-1.5 py-1">
          <span className="text-xs">🧠</span>
          <Streamdown className="select-text" mode="static">
            {preview}
          </Streamdown>
        </span>
      </div>
      {isExpanded && restContent ? (
        <div className="mt-1 pb-2">
          <Markdown value={restContent} />
        </div>
      ) : null}
    </div>
  );
};
