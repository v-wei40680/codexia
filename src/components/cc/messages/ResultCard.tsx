import type { ResultMessage } from '../types/messages';
import { Card } from '@/components/ui/card';

interface Props {
  msg: ResultMessage;
}

export function ResultCard({ msg }: Props) {
  return (
    <Card className="bg-emerald-500/5 border-emerald-500/20 text-xs">
      <div className="text-emerald-900/80 dark:text-emerald-100/80">
        {msg.is_error && (
          <span className="ml-2 text-red-500 italic">Error occurred</span>
        )}
      </div>
      <div>
        {(msg.duration_ms / 1000).toFixed(2)}s · {msg.num_turns} turns
        {msg.total_cost_usd ? ` · $${msg.total_cost_usd.toFixed(4)}` : ''}
      </div>
    </Card>
  );
}

