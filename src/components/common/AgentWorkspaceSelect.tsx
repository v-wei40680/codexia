import { useState } from 'react';
import { Monitor, Split, ChevronDown } from 'lucide-react';
import type { ThreadCwdMode } from '@/stores/codex';
import { cn } from '@/lib/utils';
import { RateLimitTrigger, RateLimitContent, useRateLimits } from '../codex/widget/RateLimitWidget';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/stores';

export interface AgentWorkspaceSelectProps {
  value: ThreadCwdMode;
  onValueChange: (value: ThreadCwdMode) => void;
  className?: string;
  triggerClassName?: string;
  iconSize?: number;
}

const MODE_ICONS: Record<ThreadCwdMode, React.ReactNode> = {
  local: <Monitor size={14} />,
  worktree: <Split size={14} />,
};

const MODE_LABELS: Record<ThreadCwdMode, string> = {
  local: 'Local',
  worktree: 'Worktree',
};

export function AgentWorkspaceSelect({
  value,
  onValueChange,
  triggerClassName,
  iconSize = 14,
}: AgentWorkspaceSelectProps) {
  const { selectedAgent } = useWorkspaceStore()
  const [rateLimitOpen, setRateLimitOpen] = useState(false);
  // Fetch eagerly so data is ready when user expands
  const rateLimits = useRateLimits();
  const primaryWindow = rateLimits?.rateLimits.primary ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-7 text-xs px-2 gap-1', triggerClassName)}
        >
          {MODE_ICONS[value]}
          <span>{MODE_LABELS[value]}</span>
          <ChevronDown size={10} className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() => onValueChange('local' as ThreadCwdMode)}
          className={cn(value === 'local' && 'bg-accent')}
        >
          <Monitor size={iconSize} />
          <span>Local</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onValueChange('worktree' as ThreadCwdMode)}
          className={cn(value === 'worktree' && 'bg-accent')}
        >
          <Split size={iconSize} />
          <span>Worktree</span>
        </DropdownMenuItem>
        {selectedAgent === 'codex' && <>
          <DropdownMenuSeparator />
          {/* Rate limit toggle — participates in ↑↓ navigation */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault(); // prevent menu close
              setRateLimitOpen(o => !o);
            }}
          >
            <RateLimitTrigger isOpen={rateLimitOpen} />
          </DropdownMenuItem>
          {rateLimitOpen && (
            <DropdownMenuLabel className="font-normal p-0">
              <RateLimitContent primaryWindow={primaryWindow} />
            </DropdownMenuLabel>
          )}
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
