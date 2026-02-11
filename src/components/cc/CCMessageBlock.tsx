import { Badge } from '../ui/badge';
import type { ContentBlock } from '@/types/cc/cc-messages';
import { DiffMessage } from './DiffMessage';
import { CCTodoList } from './CCTodoList';

interface Props {
  block: ContentBlock;
  index: number;
}

export function CCMessageBlock({ block, index }: Props) {
  const blockKey = `block-${index}`;

  switch (block.type) {
    case 'text':
      return (
        <div
          key={blockKey}
          className="rounded-lg border border-border bg-muted/30 p-3 max-w-full overflow-hidden"
        >
          <div className="text-xs font-semibold text-muted-foreground mb-2">ASSISTANT</div>
          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {block.text}
          </div>
        </div>
      );

    case 'thinking':
      return (
        <div
          key={blockKey}
          className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 max-w-full overflow-hidden"
        >
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
            THINKING
          </div>
          <div className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words">
            {block.thinking}
          </div>
        </div>
      );

    case 'tool_use':
      return (
        <div
          key={blockKey}
          className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 max-w-full overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              TOOL USE
            </div>
            <Badge
              variant="secondary"
              className="text-[10px] h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-none"
            >
              {block.name}
            </Badge>
            {['Read', 'Edit', 'Write'].includes(block.name || '') && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 border-purple-200/50 dark:border-purple-800/50 text-purple-600 dark:text-purple-400"
              >
                {block.input?.file_path}
              </Badge>
            )}
            {block.name === 'Read' && (
              <>
                {block.input?.offset && (
                  <Badge variant="outline" className="text-xs">
                    offset: {block.input.offset}
                  </Badge>
                )}
                {block.input?.limit && (
                  <Badge variant="outline" className="text-xs">
                    limit: {block.input.limit}
                  </Badge>
                )}
              </>
            )}
            {block.name === 'Glob' && block.input?.pattern && (
              <Badge variant="outline" className="text-xs">
                {block.input.pattern}
              </Badge>
            )}
            {block.name === 'Bash' && (
              <Badge variant="outline" className="text-xs">
                {block.input.description}
              </Badge>
            )}
          </div>

          {/* Show full input for non-file tools */}
          {!['Read', 'Edit', 'Glob', 'Write', 'Bash', 'TodoWrite'].includes(block.name || '') && (
            <pre className="text-xs overflow-auto bg-background/50 rounded-md border border-border p-3 max-h-60 break-all whitespace-pre-wrap font-mono">
              <code>{JSON.stringify(block.input, null, 2)}</code>
            </pre>
          )}

          {/* Special rendering for Edit */}
          {block.name === 'Edit' && (
            <DiffMessage
              oldString={block.input?.old_string || ''}
              newString={block.input?.new_string || ''}
            />
          )}

          {/* Special rendering for Write */}
          {block.name === 'Write' && block.input?.content && (
            <pre className="text-xs overflow-auto bg-background/50 rounded-md border border-border p-3 max-h-60 break-all whitespace-pre-wrap font-mono">
              <code>{block.input.content}</code>
            </pre>
          )}

          {/* Special rendering for TodoWrite */}
          {block.name === 'TodoWrite' && block.input?.todos && (
            <CCTodoList todos={block.input.todos} />
          )}

          {block.name === 'Bash' && <div className="flex">{block.input?.command}</div>}
        </div>
      );

    case 'tool_result': {
      const isString = typeof block.content === 'string';
      const isLongText = isString && (block.content as string).length > 500;

      return (
        <div
          key={blockKey}
          className={`rounded-lg border p-3 max-w-full overflow-hidden ${
            block.is_error
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-emerald-500/20 bg-emerald-500/5'
          }`}
        >
          <div
            className={`text-xs font-semibold mb-2 ${
              block.is_error
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            TOOL RESULT {block.is_error && '(ERROR)'}
          </div>
          {isString ? (
            <div
              className={`text-sm whitespace-pre-wrap break-words overflow-auto text-foreground/90 ${isLongText ? 'max-h-60' : ''}`}
            >
              {block.content as string}
            </div>
          ) : (
            <pre className="text-xs overflow-auto max-h-60 break-all whitespace-pre-wrap font-mono bg-background/30 p-2 rounded border border-border/50">
              <code>{JSON.stringify(block.content, null, 2)}</code>
            </pre>
          )}
        </div>
      );
    }

    default:
      return (
        <div
          key={blockKey}
          className="rounded-lg border border-border bg-muted/30 p-3 max-w-full overflow-hidden"
        >
          <pre className="text-xs overflow-auto break-all whitespace-pre-wrap font-mono">
            <code>{JSON.stringify(block, null, 2)}</code>
          </pre>
        </div>
      );
  }
}
