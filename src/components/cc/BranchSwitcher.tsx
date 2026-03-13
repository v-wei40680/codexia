import { useEffect, useState } from 'react';
import { GitBranch, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { gitListBranches, gitCheckoutBranch, type GitBranchInfoResponse } from '@/services/tauri/git';
import { cn } from '@/lib/utils';

type Props = {
  cwd: string;
  branchInfo: GitBranchInfoResponse;
  onBranchChanged: () => void;
};

export function BranchSwitcher({ cwd, branchInfo, onBranchChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    gitListBranches(cwd)
      .then((res) => setBranches(res.branches))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, [open, cwd]);

  async function handleSelect(branch: string) {
    if (branch === branchInfo.branch || switching) return;
    setSwitching(branch);
    try {
      await gitCheckoutBranch(cwd, branch);
      setOpen(false);
      onBranchChanged();
    } catch {
      // error is shown via toast from postNoContent/invokeTauri
    } finally {
      setSwitching(null);
    }
  }

  const label = branchInfo.owner
    ? `${branchInfo.owner}/${branchInfo.repo}:${branchInfo.branch}`
    : `${branchInfo.repo}:${branchInfo.branch}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground font-mono opacity-60 hover:opacity-100 transition-opacity">
          <GitBranch className="h-3 w-3 shrink-0" />
          <span>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-56 p-1">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto">
            {branches.map((branch) => {
              const isCurrent = branch === branchInfo.branch;
              const isSwitching = switching === branch;
              return (
                <button
                  key={branch}
                  onClick={() => handleSelect(branch)}
                  disabled={!!switching}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-mono transition-colors',
                    isCurrent
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    switching && !isSwitching && 'opacity-50'
                  )}
                >
                  {isSwitching ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                  ) : isCurrent ? (
                    <Check className="h-3 w-3 shrink-0 text-primary" />
                  ) : (
                    <span className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{branch}</span>
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
