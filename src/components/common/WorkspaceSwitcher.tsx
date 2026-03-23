import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Check, Loader2, FolderOpen, FolderPlus, ChevronDown, ArrowLeft } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { gitListBranches, gitCheckoutBranch, gitBranchInfo, type GitBranchInfoResponse } from '@/services/tauri/git';
import { cn } from '@/lib/utils';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { open } from '@tauri-apps/plugin-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
