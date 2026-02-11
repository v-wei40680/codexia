import { useState } from 'react';
import type { CCMessage as CCMessageType } from '@/types/cc/cc-messages';
import { Card } from '@/components/ui/card';
import { CCMessageBlock } from '@/components/cc/CCMessageBlock';

interface CCMessageProps {
  message: CCMessageType;
  index: number;
}

export function CCMessage({ message: msg, index: idx }: CCMessageProps) {
  switch (msg.type) {
    case 'assistant':
      return (
        <div className="space-y-2">
          {msg.message.error && (
            <Card className="p-3 bg-red-500/5 border-red-500/20">
              <div className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">
                Error: {msg.message.error}
              </div>
            </Card>
          )}
          {msg.message.content.map((block, blockIdx) => (
            <CCMessageBlock key={`${idx}-${blockIdx}`} block={block} index={blockIdx} />
          ))}
        </div>
      );

    case 'user': {
      // Support multiple formats: text, content, or legacy message.content
      const userContent = msg.text
        ? msg.text
        : msg.message?.content
          ? typeof msg.message.content === 'string'
            ? msg.message.content
            : null
          : null;
      const userBlocks = msg.content
        ? msg.content
        : msg.message?.content && Array.isArray(msg.message.content)
          ? msg.message.content
          : null;

      return (
        <Card className="p-3 bg-blue-50 dark:bg-blue-950">
          {userContent ? (
            <div className="whitespace-pre-wrap">{userContent}</div>
          ) : userBlocks ? (
            <div className="space-y-2">
              {userBlocks.map((block, blockIdx) => (
                <CCMessageBlock key={`${idx}-user-${blockIdx}`} block={block} index={blockIdx} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Empty message</div>
          )}
        </Card>
      );
    }

    case 'system': {
      if (msg.subtype === 'init') {
        const [showTools, setShowTools] = useState(false);

        return (
          <Card className="p-2 bg-muted/30 border-border">
            <div className="text-xs text-muted-foreground">
              Session initialized: {msg.session_id}
              {msg.tools && (
                <span>
                  {' | '}
                  <button
                    onClick={() => setShowTools(!showTools)}
                    className="underline hover:text-foreground cursor-pointer"
                  >
                    {msg.tools.length} tools
                  </button>
                </span>
              )}
              {msg.model && ` | Model: ${msg.model}`}
            </div>
            {showTools && msg.tools && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="text-xs font-semibold mb-1 text-muted-foreground">
                  Available Tools:
                </div>
                <div className="flex flex-wrap gap-1">
                  {msg.tools.map((tool, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground border border-border/50"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      }
      return null;
    }

    case 'result':
      return (
        <Card className="p-3 bg-emerald-500/5 border-emerald-500/20">
          <div className="text-xs font-semibold mb-1 text-emerald-600 dark:text-emerald-400">
            Result
          </div>
          <div className="text-xs space-y-1 text-emerald-900/80 dark:text-emerald-100/80">
            <div>
              Duration: {msg.duration_ms}ms ({(msg.duration_ms / 1000).toFixed(2)}s)
            </div>
            <div>Turns: {msg.num_turns}</div>
            {msg.total_cost_usd && <div>Cost: ${msg.total_cost_usd.toFixed(4)}</div>}
            {msg.is_error && (
              <div className="text-red-600 dark:text-red-400 font-semibold italic">
                Error occurred
              </div>
            )}
            {msg.result && (
              <div className="mt-2 whitespace-pre-wrap text-foreground">{msg.result}</div>
            )}
            {msg.structured_output && (
              <div className="mt-2">
                <div className="font-semibold mb-1 text-foreground/80">Structured Output:</div>
                <pre className="overflow-auto bg-background/50 border border-border rounded-md p-3 text-xs font-mono">
                  <code>{JSON.stringify(msg.structured_output, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        </Card>
      );

    case 'stream_event':
      return null;

    default:
      return (
        <Card className="p-3">
          <pre className="text-xs overflow-auto">
            <code>{JSON.stringify(msg, null, 2)}</code>
          </pre>
        </Card>
      );
  }
}
