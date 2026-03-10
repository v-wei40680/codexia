import type { ResultMessage } from '../types/messages';
import { Card } from '@/components/ui/card';
import { safeStringify } from './utils';

interface Props {
  msg: ResultMessage;
}

export function ResultCard({ msg }: Props) {
  return (
    <Card className="p-3 bg-emerald-500/5 border-emerald-500/20 text-xs">
      <div className="text-emerald-900/80 dark:text-emerald-100/80">
        {(msg.duration_ms / 1000).toFixed(2)}s · {msg.num_turns} turns
        {msg.total_cost_usd ? ` · $${msg.total_cost_usd.toFixed(4)}` : ''}
        {msg.is_error && (
          <span className="ml-2 text-red-500 italic">Error occurred</span>
        )}
      </div>
      {msg.result && (
        <div className="mt-2 whitespace-pre-wrap text-foreground">
          {msg.result}
        </div>
      )}
      {msg.structured_output && (
        <pre className="mt-2 overflow-auto bg-background/50 border border-border rounded-md p-3 max-h-64 font-mono">
          <code>{safeStringify(msg.structured_output)}</code>
        </pre>
      )}
    </Card>
  );
}

