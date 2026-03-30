import { useEffect, useState, useCallback } from 'react';
import { GitBranch, GitBranchPlus, Check, Loader2, FolderOpen, FolderPlus, ChevronDown, ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { gitListBranches, gitCheckoutBranch, gitCreateBranch, gitBranchInfo, gitStatus, type GitBranchInfoResponse } from '@/services/tauri/git';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BrowserProjects } from '@/components/project-selector';
import { canonicalizePath, getHomeDirectory, readDirectory, type TauriFileEntry } from '@/services/tauri';
import { isDesktopTauri } from '@/hooks/runtime';

export function WorkspaceSwitcher() {
  const [projectOpen, setProjectOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [branchInfo, setBranchInfo] = useState<GitBranchInfoResponse | null>(null);
  const [browseMode, setBrowseMode] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [homeDir, setHomeDir] = useState('');
  const [browseEntries, setBrowseEntries] = useState<TauriFileEntry[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseSearch, setBrowseSearch] = useState('');
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [dirtyBranch, setDirtyBranch] = useState<string | null>(null);
  const [dirtyCount, setDirtyCount] = useState(0);
  const [newBranchMode, setNewBranchMode] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCreating, setNewBranchCreating] = useState(false);
  const [newBranchError, setNewBranchError] = useState<string | null>(null);

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

  async function doCheckoutBranch(branch: string) {
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

  async function handleSelectBranch(branch: string) {
    if (branch === branchInfo?.branch || switching) return;
    try {
      const status = await gitStatus(cwd);
      if (status.entries.length > 0) {
        setDirtyCount(status.entries.length);
        setDirtyBranch(branch);
        return;
      }
    } catch {
      // if status check fails, proceed with checkout anyway
    }
    await doCheckoutBranch(branch);
  }

  async function handleCreateBranch() {
    const name = newBranchName.trim();
    if (!name || newBranchCreating) return;
    setNewBranchError(null);
    setNewBranchCreating(true);
    try {
      // Check for uncommitted changes and stash/warn if needed (still proceed — new branch keeps working tree)
      await gitCreateBranch(cwd, name);
      setBranchInfo((prev) => prev ? { ...prev, branch: name } : prev);
      setBranches((prev) => [...prev, name].sort());
      setNewBranchMode(false);
      setNewBranchName('');
      setBranchOpen(false);
      refreshBranchInfo();
    } catch (e) {
      setNewBranchError(String(e));
    } finally {
      setNewBranchCreating(false);
    }
  }

  const handleSelectProject = useCallback(
    (project: string) => {
      setCwd(project);
      setProjectOpen(false);
    },
    [setCwd]
  );

  async function loadBrowseDirectory(path: string) {
    setBrowseLoading(true);
    setBrowseError(null);
    try {
      const canonicalPath = await canonicalizePath(path);
      const data = await readDirectory(canonicalPath);
      setCurrentPath(canonicalPath);
      setBrowseEntries(data);
    } catch {
      setBrowseError('Unable to read this directory');
    } finally {
      setBrowseLoading(false);
    }
  }

  async function handleBrowseDirectory(path: string) {
    setBrowseSearch('');
    await loadBrowseDirectory(path);
  }

  async function handleSelectBrowseProject(path: string) {
    addProject(path);
    setCwd(path);
    setBrowseMode(false);
    setProjectOpen(false);
  }

  const handleChooseFolder = useCallback(async () => {
    if (isDesktopTauri()) {
      const projectPath = await open({ directory: true, multiple: false });
      if (!projectPath || Array.isArray(projectPath)) return;
      addProject(projectPath as string);
      setCwd(projectPath as string);
      setProjectOpen(false);
    } else {
      // Mobile: use in-popover directory browser
      setBrowseSearch('');
      setBrowseError(null);
      try {
        const home = await getHomeDirectory();
        setHomeDir(home);
        const startPath = cwd || home;
        if (startPath) await loadBrowseDirectory(startPath);
      } catch {
        setBrowseError('Unable to load home directory');
      }
      setBrowseMode(true);
    }
  }, [addProject, setCwd, cwd]);

  const repoLabel = branchInfo
    ? branchInfo.owner
      ? `${branchInfo.owner}/${branchInfo.repo}`
      : branchInfo.repo
    : (cwd.split('/').filter(Boolean).pop() ?? cwd);

  return (
    <div className="flex items-center gap-1 font-mono py-2">
      {/* Left: Project selector */}
      <Popover open={projectOpen} onOpenChange={(o) => { setProjectOpen(o); if (!o) setBrowseMode(false); }}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto gap-1 px-1.5 py-0.5 text-xs text-muted-foreground">
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span>{repoLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-96 max-w-[calc(100vw-2rem)] p-0">
          {browseMode ? (
            <>
              <div className="flex items-center gap-2 border-b px-2 py-2">
                <Input
                  placeholder="Filter folders..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="h-8 text-base"
                />
                <Button variant="ghost" size="sm" onClick={() => setBrowseMode(false)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <BrowserProjects
                currentPath={currentPath}
                homeDir={homeDir}
                entries={browseEntries}
                isLoading={browseLoading}
                search={browseSearch}
                error={browseError}
                onLoadDirectory={handleBrowseDirectory}
                onAddProject={handleSelectBrowseProject}
              />
            </>
          ) : (
            <>
              <div className="max-h-60 overflow-y-auto p-1">
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
              <div className="border-t p-1">
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
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Dirty working tree confirmation */}
      <AlertDialog open={dirtyBranch !== null} onOpenChange={(o) => { if (!o) setDirtyBranch(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uncommitted changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have {dirtyCount} uncommitted {dirtyCount === 1 ? 'file' : 'files'}. Switch to{' '}
              <span className="font-mono font-semibold">{dirtyBranch}</span> anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDirtyBranch(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const branch = dirtyBranch!;
                setDirtyBranch(null);
                doCheckoutBranch(branch);
              }}
            >
              Switch anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Right: Branch switcher (only when in a git repo) */}
      {branchInfo && <Popover open={branchOpen} onOpenChange={(o) => { setBranchOpen(o); if (!o) { setNewBranchMode(false); setNewBranchName(''); setNewBranchError(null); } }}>
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
            <>
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
              <div className="border-t pt-1 mt-1">
                {newBranchMode ? (
                  <div className="px-1 pb-1 flex flex-col gap-1">
                    <Input
                      autoFocus
                      placeholder="New branch name..."
                      value={newBranchName}
                      onChange={(e) => { setNewBranchName(e.target.value); setNewBranchError(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBranch(); if (e.key === 'Escape') { setNewBranchMode(false); setNewBranchName(''); } }}
                      className="h-7 text-xs font-mono"
                    />
                    {newBranchError && <p className="text-[10px] text-destructive px-1">{newBranchError}</p>}
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 flex-1 text-xs" onClick={handleCreateBranch} disabled={!newBranchName.trim() || newBranchCreating}>
                        {newBranchCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create'}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setNewBranchMode(false); setNewBranchName(''); setNewBranchError(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewBranchMode(true)}
                    className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    <GitBranchPlus className="h-3 w-3 shrink-0" />
                    <span>New branch</span>
                  </Button>
                )}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>}
    </div>
  );
}
