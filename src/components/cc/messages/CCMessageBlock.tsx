import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ContentBlock, ToolUseBlock } from '../types/messages';
import { DiffMessage } from './DiffMessage';
import { CCTodoList } from './CCTodoList';
import { getFilename } from '@/utils/getFilename';
import { ChevronDown, ChevronRight, FileCode, Folder, Search } from 'lucide-react';

const FILE_TOOLS = ['Read', 'Edit', 'Write'] as const;
const NO_RAW_INPUT_TOOLS = ['Read', 'Edit', 'Glob', 'Write', 'Bash', 'TodoWrite', 'Grep'];
const SILENT_RESULT_TOOLS = ['Read', 'Glob', 'Grep'];

interface Props {
  block: ContentBlock;
  index: number;
  toolName?: string;
}

function ToolUseBadges({ block, showDiff, onToggleDiff }: {
  block: ToolUseBlock;
  showDiff: boolean;
  onToggleDiff: () => void;
}) {
  const isFileTool = (FILE_TOOLS as readonly string[]).includes(block.name);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="text-[10px] h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-none">
        {block.name}
      </Badge>
      {isFileTool && (
        <Badge variant="outline">
          {getFilename(block.input?.file_path)} {block.name === 'Read' && (
            <>:
              {block.input?.offset && <>{block.input.offset}</>}-
              {block.input?.limit && <>{block.input.limit}</>}
            </>
          )}
        </Badge>
      )}
      {block.name === 'Edit' && (
        <Button variant="ghost" size="icon" onClick={onToggleDiff} className="h-4 w-4">
          {showDiff ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      )}

      {block.name === 'Glob' && (
        <Badge variant="outline">{block.input.pattern}</Badge>
      )}
      {block.name === 'Grep' && (
        <span>
          <Badge variant="outline"><Search className="h-3 w-3" />{block.input.pattern}</Badge> in
          <Badge variant="outline"><Folder className="h-3 w-3" />{block.input.path}</Badge>
          {block.input.glob && <Badge variant="outline"><FileCode className="h-3 w-3" />{block.input.glob}</Badge>}
        </span>
      )}
      {block.name === 'Bash' && block.input?.description && (
        <Badge variant="outline" className="text-[10px] h-4">{block.input.description}</Badge>
      )}
    </div>
  );
}

export function CCMessageBlock({ block, index, toolName }: Props) {
  const blockKey = `block-${index}`;
  const [showEditDiff, setShowEditDiff] = useState(false);
  const [showWriteResult, setShowWriteResult] = useState(false);

  switch (block.type) {
    case 'text':
      return (
        <div key={blockKey} className="text-sm text-foreground whitespace-pre-wrap break-words px-1">
          {block.text}
        </div>
      );

    case 'thinking':
      return (
        <div key={blockKey} className="rounded-md border-l-2 border-amber-400/50 pl-3 py-1 max-w-full overflow-hidden">
          <div className="text-xs text-amber-700 dark:text-amber-300 whitespace-pre-wrap break-words italic opacity-75">
            {block.thinking}
          </div>
        </div>
      );

    case 'tool_use':
      return (
        <div key={blockKey} className="overflow-auto">
          <ToolUseBadges block={block} showDiff={showEditDiff} onToggleDiff={() => setShowEditDiff((p) => !p)} />
          {!NO_RAW_INPUT_TOOLS.includes(block.name) && (
            <pre className="mt-2 text-xs overflow-auto bg-background/50 rounded-md p-3 max-h-60 break-all whitespace-pre-wrap font-mono">
              <code>{JSON.stringify(block.input, null, 2)}</code>
            </pre>
          )}
          {block.name === 'Edit' && showEditDiff && (
            <div className="mt-2">
              <DiffMessage oldString={block.input?.old_string || ''} newString={block.input?.new_string || ''} />
            </div>
          )}
          {block.name === 'Write' && block.input?.content && (
            <pre className="mt-2 text-xs overflow-auto bg-background/50 rounded-md p-3 max-h-60 break-all whitespace-pre-wrap font-mono">
              <code>{block.input.content}</code>
            </pre>
          )}
          {block.name === 'Bash' && block.input?.command && (
            <div className="mt-1 text-xs font-mono text-muted-foreground break-all">{block.input.command}</div>
          )}
          {block.name === 'TodoWrite' && block.input?.todos && (
            <CCTodoList todos={block.input.todos} />
          )}
        </div>
      );

    case 'tool_result': {
      const isString = typeof block.content === 'string';
      const content = block.content;

      if (content == null || (isString && (content as string).trim().length === 0)) return null;
      if (
        (toolName && SILENT_RESULT_TOOLS.includes(toolName)) ||
        (!toolName && !block.is_error && isString && (content as string).length > 200)
      ) return null;

      const isError = !!block.is_error;
      const isWriteTool = toolName === 'Write';
      const isLongText = isString && (content as string).length > 500;

      return (
        <div
          key={blockKey}
          className={`rounded-lg border p-3 max-w-full overflow-hidden ${isError ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
            }`}
        >
          {/* Only show toggle for Write; errors are self-evident from color */}
          {isWriteTool && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost" size="sm"
                onClick={() => setShowWriteResult((p) => !p)}
                className="h-6 px-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1"
              >
                {showWriteResult ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {showWriteResult ? 'Hide' : 'Output'}
              </Button>
            </div>
          )}
          {(!isWriteTool || showWriteResult) && (
            isString ? (
              <div className={`text-xs whitespace-pre-wrap break-words overflow-auto text-foreground/80 ${isLongText ? 'max-h-60' : ''}`}>
                {content as string}
              </div>
            ) : (
              <pre className="text-xs overflow-auto max-h-60 break-all whitespace-pre-wrap font-mono bg-background/30 p-2 rounded">
                <code>{JSON.stringify(content, null, 2)}</code>
              </pre>
            )
          )}
        </div>
      );
    }

    default:
      return (
        <div key={blockKey} className="rounded-lg border border-border bg-muted/30 p-3 max-w-full overflow-hidden">
          <pre className="text-xs overflow-auto break-all whitespace-pre-wrap font-mono">
            <code>{JSON.stringify(block, null, 2)}</code>
          </pre>
        </div>
      );
  }
}
