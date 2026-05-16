import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Split } from 'lucide-react';
import type { ThreadCwdMode } from '@/stores/codex';
import { cn } from '@/lib/utils';

export interface AgentWorkspaceSelectProps {
  value: ThreadCwdMode;
  onValueChange: (value: ThreadCwdMode) => void;
  className?: string;
  triggerClassName?: string;
  iconSize?: number;
}

export function AgentWorkspaceSelect({
  value,
  onValueChange,
  triggerClassName,
  iconSize = 14,
}: AgentWorkspaceSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as ThreadCwdMode)}>
      <SelectTrigger className={cn('w-fit h-7 text-xs', triggerClassName)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="local">
          <span className="inline-flex items-center gap-1.5">
            <Monitor size={iconSize} />
            <span>Local</span>
          </span>
        </SelectItem>
        <SelectItem value="worktree">
          <span className="inline-flex items-center gap-1.5">
            <Split size={iconSize} />
            <span>Worktree</span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
