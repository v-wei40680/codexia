import { useCallback, useEffect, useMemo, useState } from 'react';
import { createTwoFilesPatch } from 'diff';
import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view-pure.css';
import {
  ChevronDown,
  Folder,
  FolderOpen,
  Minus,
  Menu,
  Plus,
  RefreshCw,
  Undo2,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  gitFileDiff,
  gitFileDiffMeta,
  gitStageFiles,
  gitStatus,
  gitUnstageFiles,
  type GitFileDiffResponse,
  type GitFileDiffMetaResponse,
  type GitStatusResponse,
} from '@/services/tauri';
import { useGitWatch } from '@/hooks/useGitWatch';
import { useWorkspaceStore } from '@/stores';
import { GitFileTree } from './GitFileTree';
import type { DiffSection, DiffSource, GitDiffPanelProps } from './types';
import { LARGE_DIFF_THRESHOLD_BYTES, buildFileTree, formatBytes } from './utils';

export function GitDiffPanel({ cwd, isActive }: GitDiffPanelProps) {
  const { selectedFilePath, setSelectedFilePath } = useWorkspaceStore();
  const [gitData, setGitData] = useState<GitStatusResponse | null>(null);
  const [gitLoading, setGitLoading] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [selectedDiffSection, setSelectedDiffSection] = useState<DiffSection>('unstaged');
  const [diffData, setDiffData] = useState<GitFileDiffResponse | null>(null);
  const [diffMeta, setDiffMeta] = useState<GitFileDiffMetaResponse | null>(null);
  const [diffMetaLoading, setDiffMetaLoading] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [largeDiffConfirmedKey, setLargeDiffConfirmedKey] = useState<string | null>(null);
  const [showFileTree, setShowFileTree] = useState(true);
  const [wordWrapEnabled, setWordWrapEnabled] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [diffSource, setDiffSource] = useState<DiffSource>('uncommitted');
  const [diffViewCollapsed, setDiffViewCollapsed] = useState(false);
  const [bulkStageDialogOpen, setBulkStageDialogOpen] = useState(false);
  const [bulkStageLoading, setBulkStageLoading] = useState(false);

  const refreshGitStatus = useCallback(async () => {
    if (!cwd) return;
    setGitLoading(true);
    setGitError(null);
    try {
      const status = await gitStatus(cwd);
      setGitData(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setGitError(message);
      setGitData(null);
    } finally {
      setGitLoading(false);
    }
  }, [cwd]);

  // Watch .git/index for changes and auto-refresh
  useGitWatch(cwd, refreshGitStatus, isActive);

  useEffect(() => {
    if (cwd) return;
    setGitData(null);
    setGitError(null);
    setGitLoading(false);
    setSelectedDiffPath(null);
    setDiffData(null);
    setDiffMeta(null);
    setDiffMetaLoading(false);
    setDiffLoading(false);
    setLargeDiffConfirmedKey(null);
  }, [cwd]);

  useEffect(() => {
    if (!isActive || !cwd) return;
    refreshGitStatus();
  }, [isActive, cwd, refreshGitStatus]);

  const stagedEntries = useMemo(
    () =>
      (gitData?.entries ?? [])
        .filter((entry) => entry.index_status !== ' ' && entry.index_status !== '?')
        .sort((a, b) => a.path.localeCompare(b.path)),
    [gitData]
  );

  const unstagedEntries = useMemo(
    () =>
      (gitData?.entries ?? [])
        .filter((entry) => entry.worktree_status !== ' ' || entry.index_status === '?')
        .sort((a, b) => a.path.localeCompare(b.path)),
    [gitData]
  );

  const activeEntries = useMemo(
    () => (selectedDiffSection === 'staged' ? stagedEntries : unstagedEntries),
    [selectedDiffSection, stagedEntries, unstagedEntries]
  );

  const filteredEntries = useMemo(() => {
    const keyword = filterText.trim().toLowerCase();
    if (!keyword) return activeEntries;
    return activeEntries.filter((entry) => entry.path.toLowerCase().includes(keyword));
  }, [activeEntries, filterText]);

  const fileTree = useMemo(() => buildFileTree(filteredEntries), [filteredEntries]);
  const bulkStagePaths = useMemo(() => {
    if (selectedDiffSection !== 'unstaged') return [];
    return [...new Set(filteredEntries.map((entry) => entry.path))];
  }, [filteredEntries, selectedDiffSection]);

  useEffect(() => {
    if (filteredEntries.length === 0) {
      setSelectedDiffPath(null);
      setDiffData(null);
      setDiffMeta(null);
      return;
    }
    if (!selectedDiffPath || !filteredEntries.some((entry) => entry.path === selectedDiffPath)) {
      setSelectedDiffPath(filteredEntries[0].path);
    }
  }, [filteredEntries, selectedDiffPath]);

  useEffect(() => {
    const currentDiffKey = selectedDiffPath ? `${selectedDiffSection}:${selectedDiffPath}` : null;
    if (!cwd || !selectedDiffPath || !currentDiffKey) {
      setDiffData(null);
      setDiffMeta(null);
      setDiffMetaLoading(false);
      setDiffLoading(false);
      return;
    }
    let cancelled = false;
    const loadDiff = async () => {
      setDiffData(null);
      setDiffLoading(false);
      setDiffMetaLoading(true);
      try {
        const meta = await gitFileDiffMeta(cwd, selectedDiffPath, selectedDiffSection === 'staged');
        if (cancelled) return;
        setDiffMeta(meta);
        setDiffMetaLoading(false);

        const shouldRequireConfirm =
          meta.total_bytes > LARGE_DIFF_THRESHOLD_BYTES && largeDiffConfirmedKey !== currentDiffKey;
        if (shouldRequireConfirm) {
          return;
        }

        setDiffLoading(true);
        const result = await gitFileDiff(cwd, selectedDiffPath, selectedDiffSection === 'staged');
        if (cancelled) return;
        setDiffData(result);
      } catch {
        if (cancelled) return;
        setDiffMeta(null);
        setDiffData(null);
      } finally {
        if (cancelled) return;
        setDiffMetaLoading(false);
        setDiffLoading(false);
      }
    };
    loadDiff();
    return () => {
      cancelled = true;
    };
  }, [cwd, selectedDiffPath, selectedDiffSection, largeDiffConfirmedKey]);

  const currentDiffKey = useMemo(
    () => (selectedDiffPath ? `${selectedDiffSection}:${selectedDiffPath}` : null),
    [selectedDiffPath, selectedDiffSection]
  );

  const requiresLargeDiffConfirmation = useMemo(() => {
    if (!currentDiffKey || !diffMeta) return false;
    if (largeDiffConfirmedKey === currentDiffKey) return false;
    return diffMeta.total_bytes > LARGE_DIFF_THRESHOLD_BYTES;
  }, [currentDiffKey, diffMeta, largeDiffConfirmedKey]);

  const patchText = useMemo(() => {
    if (!diffData || !selectedDiffPath) return '';
    const oldPath = `a/${selectedDiffPath}`;
    const newPath = `b/${selectedDiffPath}`;
    const rawPatch = createTwoFilesPatch(
      oldPath,
      newPath,
      diffData.old_content ?? '',
      diffData.new_content ?? '',
      '',
      '',
      { context: 3 }
    );
    const normalizedBody = rawPatch
      .split('\n')
      .filter((line) => !line.startsWith('Index: ') && !line.startsWith('===='))
      .join('\n');
    return `diff --git ${oldPath} ${newPath}\n${normalizedBody}`;
  }, [diffData, selectedDiffPath]);

  const diffHunks = useMemo(() => (patchText ? [patchText] : []), [patchText]);

  const resolveDiffPath = useCallback(
    (relativePath: string) => {
      if (!cwd) {
        return relativePath;
      }
      if (relativePath.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(relativePath)) {
        return relativePath;
      }
      const separator = cwd.includes('\\') ? '\\' : '/';
      return cwd.endsWith(separator) ? `${cwd}${relativePath}` : `${cwd}${separator}${relativePath}`;
    },
    [cwd]
  );

  const selectPath = (section: DiffSection, path: string) => {
    setSelectedDiffSection(section);
    setSelectedDiffPath(path);
    setSelectedFilePath(resolveDiffPath(path));
  };

  useEffect(() => {
    if (!isActive || !selectedDiffPath) {
      return;
    }
    const resolved = resolveDiffPath(selectedDiffPath);
    if (selectedFilePath !== resolved) {
      setSelectedFilePath(resolved);
    }
  }, [isActive, resolveDiffPath, selectedDiffPath, selectedFilePath, setSelectedFilePath]);

  useEffect(() => {
    if (!isActive || !cwd || !selectedFilePath) {
      return;
    }

    const toPosix = (value: string) => value.replace(/\\/g, '/');
    const cwdPosix = toPosix(cwd).replace(/\/+$/, '');
    const selectedPosix = toPosix(selectedFilePath);
    if (!selectedPosix.startsWith(`${cwdPosix}/`)) {
      return;
    }

    const relativePath = selectedPosix.slice(cwdPosix.length + 1);
    const unstagedSet = new Set(unstagedEntries.map((entry) => toPosix(entry.path)));
    const stagedSet = new Set(stagedEntries.map((entry) => toPosix(entry.path)));

    let targetSection: DiffSection | null = null;
    if (unstagedSet.has(relativePath)) {
      targetSection = 'unstaged';
    } else if (stagedSet.has(relativePath)) {
      targetSection = 'staged';
    }

    if (!targetSection) {
      return;
    }

    if (selectedDiffSection !== targetSection) {
      setSelectedDiffSection(targetSection);
    }
    if (selectedDiffPath !== relativePath) {
      setSelectedDiffPath(relativePath);
    }
  }, [cwd, isActive, selectedDiffPath, selectedDiffSection, selectedFilePath, stagedEntries, unstagedEntries]);

  const runStage = async (paths: string[]) => {
    if (!cwd || paths.length === 0) return;
    await gitStageFiles(cwd, paths);
    await refreshGitStatus();
  };

  const runUnstage = async (paths: string[]) => {
    if (!cwd || paths.length === 0) return;
    await gitUnstageFiles(cwd, paths);
    await refreshGitStatus();
  };

  const handleRevertFile = async () => {
    if (!cwd || !selectedDiffPath) return;
    // TODO: Implement revert file functionality
    console.log('Revert file:', selectedDiffPath);
  };

  const handleStageUnstageCurrentFile = async () => {
    if (!selectedDiffPath) return;
    if (selectedDiffSection === 'staged') {
      await runUnstage([selectedDiffPath]);
    } else {
      await runStage([selectedDiffPath]);
    }
  };

  const handleBulkStageConfirm = async () => {
    if (!cwd || bulkStagePaths.length === 0) return;
    setBulkStageLoading(true);
    try {
      await runStage(bulkStagePaths);
      setBulkStageDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setGitError(message);
    } finally {
      setBulkStageLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden relative">
      {/* Top toolbar - always visible */}
      <div className="border-b border-white/10 flex items-center gap-2">
        <div className="w-48 shrink-0">
          <Select
            value={diffSource}
            onValueChange={(value) => setDiffSource(value as DiffSource)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uncommitted">uncommitted changes</SelectItem>
              <SelectItem value="latest-turn">latest turn changes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Section toggle and controls - always visible */}
        <div className="flex items-center">
          <div className="flex items-center gap-1 rounded-md border border-white/10 bg-background/60 p-1">
            <Button
              size="sm"
              variant={selectedDiffSection === 'unstaged' ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedDiffSection('unstaged')}
            >
              Unstaged ({unstagedEntries.length})
            </Button>
            <Button
              size="sm"
              variant={selectedDiffSection === 'staged' ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setSelectedDiffSection('staged')}
            >
              Staged ({stagedEntries.length})
            </Button>
          </div>
          <Button
            variant={showFileTree ? 'secondary' : 'ghost'}
            size="icon-sm"
            onClick={() => setShowFileTree((value) => !value)}
            aria-label={showFileTree ? 'Hide file tree' : 'Show file tree'}
            title={showFileTree ? 'Hide file tree' : 'Show file tree'}
          >
            {showFileTree ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Panel menu" title="Panel menu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={refreshGitStatus} disabled={!cwd || gitLoading}>
                <RefreshCw className="h-4 w-4" /> Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWordWrapEnabled((value) => !value)}>
                {wordWrapEnabled ? 'Disable word wrap' : 'Enable word wrap'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Diff View - expands when file tree is hidden */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col">

          {/* Diff view toolbar */}
          {selectedDiffPath && (
            <div className="px-3 border-b border-white/10 flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground truncate flex-1" title={selectedDiffPath}>
                {selectedDiffPath}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRevertFile}
                  disabled={!selectedDiffPath}
                  title="Revert file changes"
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleStageUnstageCurrentFile}
                  disabled={!selectedDiffPath}
                  title={selectedDiffSection === 'staged' ? 'Unstage file' : 'Stage file'}
                >
                  {selectedDiffSection === 'staged' ? (
                    <Minus className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDiffViewCollapsed((value) => !value)}
                  title={diffViewCollapsed ? 'Expand diff view' : 'Collapse diff view'}
                >
                  {diffViewCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Diff content area */}
          {!diffViewCollapsed && (
            <div className="flex-1 min-h-0 overflow-auto">
              <div>
                {!selectedDiffPath && (
                  <div className="text-sm text-muted-foreground">
                    Select a file to preview diff
                  </div>
                )}
                {diffSource === 'latest-turn' && (
                  <div className="mb-3 rounded border border-dashed border-border p-2 text-xs text-muted-foreground">
                    Latest turn changes view is not available yet. Showing uncommitted file set.
                  </div>
                )}
                {selectedDiffPath && diffMetaLoading && (
                  <div className="text-sm text-muted-foreground">Preparing diff...</div>
                )}
                {selectedDiffPath && !diffMetaLoading && requiresLargeDiffConfirmation && diffMeta && (
                  <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <div className="text-amber-200">
                      Large diff detected ({formatBytes(diffMeta.total_bytes)}). Load diff manually?
                    </div>
                    <div className="mt-1 text-xs text-amber-200/80">
                      Before: {formatBytes(diffMeta.old_bytes)} • After:{' '}
                      {formatBytes(diffMeta.new_bytes)}
                    </div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        if (!currentDiffKey) return;
                        setLargeDiffConfirmedKey(currentDiffKey);
                      }}
                    >
                      Load diff
                    </Button>
                  </div>
                )}
                {selectedDiffPath && diffLoading && (
                  <div className="text-sm text-muted-foreground">Loading diff...</div>
                )}
                {selectedDiffPath &&
                  !diffMetaLoading &&
                  !requiresLargeDiffConfirmation &&
                  !diffLoading &&
                  diffData &&
                  !diffData.has_changes && (
                    <div className="text-sm text-muted-foreground">No changes</div>
                  )}
                {selectedDiffPath &&
                  !diffMetaLoading &&
                  !requiresLargeDiffConfirmation &&
                  !diffLoading &&
                  diffData &&
                  diffData.has_changes &&
                  diffHunks.length > 0 && (
                    <DiffView
                      className="git-diff-table"
                      data={{
                        oldFile: {
                          fileName: `a/${selectedDiffPath}`,
                          content: diffData.old_content ?? '',
                        },
                        newFile: {
                          fileName: `b/${selectedDiffPath}`,
                          content: diffData.new_content ?? '',
                        },
                        hunks: diffHunks,
                      }}
                      diffViewMode={DiffModeEnum.Unified}
                      diffViewTheme="dark"
                      diffViewHighlight={false}
                      diffViewWrap={wordWrapEnabled}
                    />
                  )}
              </div>
            </div>
          )}
        </div>

        {/* File Tree Panel - only shown when showFileTree is true */}
        {showFileTree && (
          <div className="w-64 min-w-[220px] min-h-0 border-l border-white/10 flex flex-col">
            <div className="px-3 border-b border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">File tree</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setBulkStageDialogOpen(true)}
                  disabled={bulkStagePaths.length === 0 || bulkStageLoading}
                  title={
                    selectedDiffSection === 'staged'
                      ? 'Switch to Unstaged to use one-key stage'
                      : 'Stage all files in current list'
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Stage all
                </Button>
              </div>
              <Input
                value={filterText}
                onChange={(event) => setFilterText(event.target.value)}
                placeholder="Filter filename or folder..."
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <div className="p-2 space-y-1">
                {gitError && (
                  <div className="text-xs text-destructive rounded border border-destructive/30 p-2">
                    {gitError}
                  </div>
                )}
                {filteredEntries.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No files matched current filter.
                  </div>
                )}
                {cwd ? (
                  <GitFileTree
                    fileTree={fileTree}
                    selectedDiffPath={selectedDiffPath}
                    selectedDiffSection={selectedDiffSection}
                    collapsedFolders={collapsedFolders}
                    onToggleFolder={toggleFolder}
                    onSelectPath={selectPath}
                    onStage={runStage}
                    onUnstage={runUnstage}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
        <Dialog open={bulkStageDialogOpen} onOpenChange={setBulkStageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stage all files?</DialogTitle>
              <DialogDescription>
                {bulkStagePaths.length === 0
                  ? 'No unstaged files are available in the current list.'
                  : `This will stage ${bulkStagePaths.length} file${bulkStagePaths.length > 1 ? 's' : ''} from the current file tree.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBulkStageDialogOpen(false)}
                disabled={bulkStageLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  void handleBulkStageConfirm();
                }}
                disabled={bulkStagePaths.length === 0 || bulkStageLoading}
              >
                {bulkStageLoading ? 'Staging...' : 'Stage all'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
