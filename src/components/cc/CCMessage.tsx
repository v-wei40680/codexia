import { useState } from 'react';
import type { CCMessage as CCMessageType } from '@/types/cc/cc-messages';
import { Card } from '@/components/ui/card';
import { CCMessageBlock } from '@/components/cc/CCMessageBlock';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Check, X } from 'lucide-react';
import { ccResolvePermission } from '@/services';
import { useCCStore } from '@/stores/ccStore';
import { cn } from '@/lib/utils';

const safeStringify = (input: any) => {
  if (!input) return null;
  try {
    const truncateDeep = (obj: any, depth = 0): any => {
      if (depth > 5) return '[Max Depth Reached]';
      if (typeof obj === 'string') {
        return obj.length > 500 ? obj.substring(0, 500) + '\n... [truncated for UI performance]' : obj;
      }
      if (Array.isArray(obj)) {
        return obj.map((v) => truncateDeep(v, depth + 1));
      }
      if (obj && typeof obj === 'object') {
        const res: any = {};
        for (const key in obj) {
          res[key] = truncateDeep(obj[key], depth + 1);
        }
        return res;
      }
      return obj;
    };
    return JSON.stringify(truncateDeep(input), null, 2);
  } catch (e) {
    return 'Error stringifying input';
  }
};

interface CCMessageProps {
  message: CCMessageType;
  index: number;
}

export function CCMessage({ message: msg, index: idx }: CCMessageProps) {
  const { updateMessage } = useCCStore();

  const handleResolvePermission = async (requestId: string, decision: 'allow' | 'allow_always' | 'allow_always_project' | 'deny') => {
    try {
      console.info('[CCMessage] Resolve permission', { requestId, decision, index: idx });
      await ccResolvePermission(requestId, decision);
      updateMessage(idx, { resolved: decision } as any);
    } catch (error) {
      console.error('Failed to resolve permission:', error);
    }
  };

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

    case 'permission_request': {
      return (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight uppercase tracking-wide">Permission Request</span>
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-background/50 border border-amber-500/20">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-muted-foreground">Tool:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-amber-600 dark:text-amber-400">{msg.toolName}</code>
              </div>
              <div className="text-xs">
                <span className="font-medium text-muted-foreground block mb-1">Parameters:</span>
                <pre className="font-mono p-2 bg-muted/30 rounded border border-border/50 overflow-auto max-h-64 text-[10px] text-foreground/80 break-all whitespace-pre-wrap">
                  <code>{safeStringify(msg.toolInput)}</code>
                </pre>
              </div>
            </div>

            {msg.resolved ? (
              <div className={cn(
                "text-[10px] font-bold px-2 py-1.5 rounded-md border text-center uppercase tracking-widest",
                msg.resolved !== 'deny'
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
              )}>
                {msg.resolved === 'allow_always'
                  ? 'Always Allowed (Session)'
                  : msg.resolved === 'allow_always_project'
                    ? 'Always Allowed (Project)'
                    : msg.resolved === 'allow'
                      ? 'Allowed'
                      : 'Denied'}
              </div>
            ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                    onClick={() => handleResolvePermission(msg.requestId, 'allow')}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Allow Once
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-700/80 hover:bg-emerald-800 text-white h-8 text-[11px]"
                    onClick={() => handleResolvePermission(msg.requestId, 'allow_always')}
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Always Allow (Session)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 border-red-500/30 text-red-500 hover:bg-red-500/5"
                    onClick={() => handleResolvePermission(msg.requestId, 'deny')}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Deny
                  </Button>
                </div>
            )}
          </div>
        </Card>
      );
    }

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
                <pre className="overflow-auto bg-background/50 border border-border rounded-md p-3 max-h-64 text-xs font-mono">
                  <code>{safeStringify(msg.structured_output)}</code>
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
          <pre className="text-xs overflow-auto max-h-64">
            <code>{safeStringify(msg)}</code>
          </pre>
        </Card>
      );
  }
}
