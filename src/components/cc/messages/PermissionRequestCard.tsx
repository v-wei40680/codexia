import type { PermissionRequestMessage } from '../types/messages';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PermissionDecision = 'allow' | 'allow_always' | 'deny';

const RESOLVED_LABEL: Record<PermissionDecision, string> = {
  allow: 'Allowed Once',
  allow_always: 'Always Allowed (Session)',
  deny: 'Denied',
};

interface Props {
  msg: PermissionRequestMessage;
  onResolve: (id: string, decision: PermissionDecision) => void;
}

export function PermissionRequestCard({ msg, onResolve }: Props) {
  const resolved = msg.resolved;

  return (
    <Card className="p-4 border-amber-500/30 bg-amber-500/5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold uppercase tracking-wide">Permission Request</span>
      </div>

      {/* Tool info */}
      <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-background/50 border border-amber-500/20 text-xs mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">Tool:</span>
          <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-amber-600 dark:text-amber-400">
            {msg.toolName}
          </code>
        </div>
        <div>
          <span className="font-medium text-muted-foreground block mb-1">Parameters:</span>
          <pre className="font-mono p-2 bg-muted/30 rounded border border-border/50 overflow-auto max-h-64 text-[10px] text-foreground/80 break-all whitespace-pre-wrap">
            <code>{JSON.stringify(msg.toolInput, null, 2)}</code>
          </pre>
        </div>
      </div>

      {/* Resolved state */}
      {resolved ? (
        <div
          className={cn(
            'text-[10px] font-bold px-2 py-1.5 rounded-md border text-center uppercase tracking-widest flex items-center justify-center gap-1.5',
            resolved === 'deny'
              ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
          )}
        >
          {resolved === 'deny' ? <X className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
          {RESOLVED_LABEL[resolved] ?? resolved}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Primary actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-8"
              onClick={() => onResolve(msg.requestId, 'allow')}
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Allow Once
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 border-red-500/30 text-red-500 hover:bg-red-500/5"
              onClick={() => onResolve(msg.requestId, 'deny')}
            >
              <X className="w-3.5 h-3.5 mr-1" /> Deny
            </Button>
          </div>
          {/* Secondary: always allow for this session */}
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-7 text-[11px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => onResolve(msg.requestId, 'allow_always')}
          >
            <ShieldCheck className="w-3 h-3 mr-1" /> Always Allow (this session)
          </Button>
        </div>
      )}
    </Card>
  );
}
