import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Check, Loader2, FolderOpen, FolderPlus, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { gitListBranches, gitCheckoutBranch, gitBranchInfo, type GitBranchInfoResponse } from '@/services/tauri/git';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';

export function WorkspaceSwitcher() {
  const [projectOpen, setProjectOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [branchInfo, setBranchInfo] = useState<GitBranchInfoResponse | null>(null);

  const { cwd, projects, addProject, setCwd } = useWorkspaceStore();

  useEffect(() => {
    if (!cwd) { setBranchInfo(null); return; }
    gitBranchInfo(cwd).then(setBranchInfo).catch(() => setBranchInfo(null));
  }, [cwd]);

  function refreshBranchInfo() {
    if (!cwd) return;
    gitBranchInfo(cwd).then(setBranchInfo).catch(() => setBranchInfo(null));
  }

  useEffect(() => {
    if (!branchOpen) return;
    setLoading(true);
    gitListBranches(cwd)
      .then((res) => setBranches(res.branches))
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, [branchOpen, cwd]);

  async function handleSelectBranch(branch: string) {
    if (branch === branchInfo?.branch || switching) return;
    setSwitching(branch);
    try {
      await gitCheckoutBranch(cwd, branch);
      setBranchOpen(false);
      refreshBranchInfo();
    } catch {
      // error is shown via toast from postNoContent/invokeTauri
    } finally {
      setSwitching(null);
    }
  }

  const handleSelectProject = useCallback(
    (project: string) => {
      setCwd(project);
      setProjectOpen(false);
    },
    [setCwd]
  );

  const handleChooseFolder = useCallback(async () => {
    const projectPath = await open({ directory: true, multiple: false });
    if (!projectPath || Array.isArray(projectPath)) return;
    addProject(projectPath as string);
    setCwd(projectPath as string);
    setProjectOpen(false);
  }, [addProject, setCwd]);

  const repoLabel = branchInfo
    ? branchInfo.owner
      ? `${branchInfo.owner}/${branchInfo.repo}`
      : branchInfo.repo
    : (cwd.split('/').filter(Boolean).pop() ?? cwd);

  return (
    <div className="flex items-center gap-1 font-mono py-2">
      {/* Left: Project selector */}
      <Popover open={projectOpen} onOpenChange={setProjectOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto gap-1 px-1.5 py-0.5 text-xs text-muted-foreground">
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span>{repoLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-96 max-w-[calc(100vw-2rem)] p-1">
          <div className="max-h-60 overflow-y-auto">
            {projects.map((project) => {
              const isCurrent = project === cwd;
              const folderName = project.split('/').filter(Boolean).pop() ?? project;
              return (
                <Button
                  key={project}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectProject(project)}
                  className={cn(
                    'h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs font-mono',
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {isCurrent ? (
                    <Check className="h-3 w-3 shrink-0 text-primary" />
                  ) : (
                    <span className="h-3 w-3 shrink-0" />
                  )}
                  <div className="flex min-w-0 flex-col items-start">
                    <span className="font-medium">{folderName}</span>
                    <span className="truncate w-full text-[10px] opacity-50">{project}</span>
                  </div>
                </Button>
              );
            })}
          </div>
          <div className="border-t mt-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChooseFolder}
              className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs text-muted-foreground"
            >
              <FolderPlus className="h-3 w-3 shrink-0" />
              <span>Choose a different folder</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Right: Branch switcher (only when in a git repo) */}
      {branchInfo && <Popover open={branchOpen} onOpenChange={setBranchOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto gap-1 px-1.5 py-0.5 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3 shrink-0" />
            <span>{branchInfo.branch}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
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
                  <Button
                    key={branch}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectBranch(branch)}
                    disabled={!!switching}
                    className={cn(
                      'h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs font-mono',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground',
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
                  </Button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>}
    </div>
  );
}
