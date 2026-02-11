import { useEffect, useMemo, useState } from 'react';
import { createTwoFilesPatch } from 'diff';
import { DiffModeEnum, DiffView } from '@git-diff-view/react';
import '@git-diff-view/react/styles/diff-view-pure.css';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  GitPullRequestArrow,
  Menu,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  type GitStatusEntry,
  type GitStatusResponse,
} from '@/services/tauri';

type DiffSection = 'staged' | 'unstaged';

type TreeNode = TreeFolderNode | TreeFileNode;

interface TreeFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: TreeNode[];
}

interface TreeFileNode {
  type: 'file';
  name: string;
  path: string;
  entry: GitStatusEntry;
}

interface MutableFolderNode {
  name: string;
  path: string;
  folders: Map<string, MutableFolderNode>;
  files: TreeFileNode[];
}

interface GitDiffPanelProps {
  cwd: string | null;
  isActive: boolean;
}

function statusTextForSection(entry: GitStatusEntry, section: DiffSection): string {
  if (entry.index_status === '?' && entry.worktree_status === '?') {
    return '??';
  }
  return section === 'staged'
    ? entry.index_status.trim() || ' '
    : entry.worktree_status.trim() || ' ';
}

function statusColorByText(text: string): string {
  if (text === '??') return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30';
  if (text.includes('U')) return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
  if (text.includes('R')) return 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30';
  if (text.includes('C')) return 'bg-sky-500/10 text-sky-500 border-sky-500/30';
  if (text.includes('T')) return 'bg-violet-500/10 text-violet-500 border-violet-500/30';
  if (text.includes('D')) return 'bg-red-500/10 text-red-500 border-red-500/30';
  if (text.includes('A')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
  if (text.includes('M')) return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
  return 'bg-muted text-muted-foreground border-border';
}

const LARGE_DIFF_THRESHOLD_BYTES = 512 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFileTree(entries: GitStatusEntry[]): TreeNode[] {
  const root: MutableFolderNode = {
    name: '',
    path: '',
    folders: new Map(),
    files: [],
  };

  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean);
    let cursor = root;
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isLast = index === parts.length - 1;
      if (isLast) {
        cursor.files.push({
          type: 'file',
          name: part,
          path: entry.path,
          entry,
        });
      } else {
        const nextPath = cursor.path ? `${cursor.path}/${part}` : part;
        const existing = cursor.folders.get(part);
        if (existing) {
          cursor = existing;
        } else {
          const created: MutableFolderNode = {
            name: part,
            path: nextPath,
            folders: new Map(),
            files: [],
          };
          cursor.folders.set(part, created);
          cursor = created;
        }
      }
    }
  }

  const toTreeNodes = (folder: MutableFolderNode): TreeNode[] => {
    const folderNodes: TreeFolderNode[] = [...folder.folders.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => ({
        type: 'folder',
        name: item.name,
        path: item.path,
        children: toTreeNodes(item),
      }));
    const fileNodes = [...folder.files].sort((a, b) => a.name.localeCompare(b.name));
    return [...folderNodes, ...fileNodes];
  };

  return toTreeNodes(root);
}

export function GitDiffPanel({ cwd, isActive }: GitDiffPanelProps) {
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

  const refreshGitStatus = async () => {
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
  };

  useEffect(() => {
    if (!isActive || !cwd) return;
    refreshGitStatus();
  }, [isActive, cwd]);

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

  const selectPath = (section: DiffSection, path: string) => {
    setSelectedDiffSection(section);
    setSelectedDiffPath(path);
  };

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

  const toggleFolder = (path: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderTreeNode = (node: TreeNode, depth: number) => {
    if (node.type === 'folder') {
      const collapsed = collapsedFolders.has(node.path);
      return (
        <div key={node.path}>
          <button
            type="button"
            className="w-full flex items-center gap-1.5 rounded px-2 py-1 text-xs hover:bg-accent/40"
            style={{ paddingLeft: depth * 12 + 8 }}
            onClick={() => toggleFolder(node.path)}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {collapsed ? (
              <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {!collapsed && node.children.map((child) => renderTreeNode(child, depth + 1))}
        </div>
      );
    }

    const active = selectedDiffPath === node.path;
    const status = statusTextForSection(node.entry, selectedDiffSection);
    return (
      <div
        key={node.path}
        className={`group flex items-center gap-2 rounded px-2 py-1 text-xs border cursor-pointer ${active ? 'bg-accent border-accent-foreground/20' : 'border-transparent hover:bg-accent/40'}`}
        style={{ paddingLeft: depth * 12 + 20 }}
        onClick={() => selectPath(selectedDiffSection, node.path)}
      >
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate flex-1" title={node.path}>
          {node.name}
        </span>
        <div className="relative shrink-0">
          <Badge
            variant="outline"
            className={`font-mono px-1.5 transition-opacity group-hover:opacity-0 ${statusColorByText(status)}`}
          >
            {status}
          </Badge>
          <Button
            size="icon-xs"
            variant="ghost"
            className="absolute inset-0 h-full w-full p-0 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
            title={selectedDiffSection === 'staged' ? 'Unstage file' : 'Stage file'}
            aria-label={selectedDiffSection === 'staged' ? 'Unstage file' : 'Stage file'}
            onClick={(event) => {
              event.stopPropagation();
              if (selectedDiffSection === 'staged') {
                runUnstage([node.path]);
              } else {
                runStage([node.path]);
              }
            }}
          >
            <GitPullRequestArrow
              className={`h-3.5 w-3.5 ${selectedDiffSection === 'staged' ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 flex overflow-hidden">
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground min-w-0">
            {selectedDiffPath ? (
              <span className="font-mono truncate block" title={selectedDiffPath}>
                {selectedDiffPath}
              </span>
            ) : (
              <span>Select a file to preview diff</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Diff panel menu"
                  title="Diff panel menu"
                >
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
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="p-3">
            {!selectedDiffPath && (
              <div className="text-sm text-muted-foreground">No file selected</div>
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
      </div>

      {showFileTree && (
        <div className="w-64 min-w-[220px] min-h-0 border-l border-white/10 flex flex-col">
          <div className="px-3 py-2 border-b border-white/10">
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
              {fileTree.map((node) => renderTreeNode(node, 0))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
