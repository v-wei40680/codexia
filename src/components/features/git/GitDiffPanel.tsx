import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@git-diff-view/react/styles/diff-view-pure.css';
import {
  gitFileDiff,
  gitFileDiffMeta,
  gitReverseFiles,
  gitStageFiles,
  gitStatus,
  gitUnstageFiles,
  type GitFileDiffResponse,
  type GitFileDiffMetaResponse,
  type GitStatusResponse,
} from '@/services/tauri';
import { useGitWatch } from '@/hooks/useGitWatch';
import { useWorkspaceStore } from '@/stores';
import { GitDiffDialogs } from './GitDiffDialogs';
import { GitDiffTopBar } from './GitDiffTopBar';
import { GitDiffViewer } from './GitDiffViewer';
import { GitFileTreePanel } from './GitFileTreePanel';
import type { DiffSection, DiffSource, GitDiffPanelProps } from './types';
import { LARGE_DIFF_THRESHOLD_BYTES, buildFileTree } from './utils';

export function GitDiffPanel({ cwd, isActive }: GitDiffPanelProps) {
  const {
    selectedFilePath,
    setSelectedFilePath,
    hasConfirmedGitRevert,
    setHasConfirmedGitRevert,
  } = useWorkspaceStore();
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
  const [revertLoading, setRevertLoading] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const selectedDiffPathRef = useRef<string | null>(null);
  const selectedDiffSectionRef = useRef<DiffSection>('unstaged');
  const toPosix = useCallback((value: string) => value.replace(/\\/g, '/'), []);
  const normalizeRelativePath = useCallback(
    (value: string) => toPosix(value).replace(/^\/+/, ''),
    [toPosix]
  );

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
    const normalizedSelected = selectedDiffPath ? normalizeRelativePath(selectedDiffPath) : null;
    const hasMatch =
      normalizedSelected !== null &&
      filteredEntries.some((entry) => normalizeRelativePath(entry.path) === normalizedSelected);
    if (!hasMatch) {
      setSelectedDiffPath(filteredEntries[0].path);
    }
  }, [filteredEntries, normalizeRelativePath, selectedDiffPath]);

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
    const sameFile =
      selectedFilePath !== null &&
      normalizeRelativePath(toPosix(selectedFilePath)) === normalizeRelativePath(toPosix(resolved));
    if (!sameFile) {
      setSelectedFilePath(resolved);
    }
  }, [
    isActive,
    normalizeRelativePath,
    resolveDiffPath,
    selectedDiffPath,
    selectedFilePath,
    setSelectedFilePath,
    toPosix,
  ]);

  useEffect(() => {
    selectedDiffPathRef.current = selectedDiffPath;
  }, [selectedDiffPath]);

  useEffect(() => {
    selectedDiffSectionRef.current = selectedDiffSection;
  }, [selectedDiffSection]);

  useEffect(() => {
    if (!isActive || !cwd || !selectedFilePath) {
      return;
    }

    const currentSelectedDiffPath = selectedDiffPathRef.current;
    const currentSelectedDiffSection = selectedDiffSectionRef.current;
    const resolvedCurrentSelection = currentSelectedDiffPath
      ? resolveDiffPath(currentSelectedDiffPath)
      : null;
    if (
      resolvedCurrentSelection &&
      normalizeRelativePath(toPosix(selectedFilePath)) ===
        normalizeRelativePath(toPosix(resolvedCurrentSelection))
    ) {
      return;
    }

    const cwdPosix = toPosix(cwd).replace(/\/+$/, '');
    const selectedPosix = toPosix(selectedFilePath);
    if (!selectedPosix.startsWith(`${cwdPosix}/`)) {
      return;
    }

    const relativePath = normalizeRelativePath(selectedPosix.slice(cwdPosix.length + 1));
    const unstagedPathMap = new Map(
      unstagedEntries.map((entry) => [normalizeRelativePath(entry.path), entry.path] as const)
    );
    const stagedPathMap = new Map(
      stagedEntries.map((entry) => [normalizeRelativePath(entry.path), entry.path] as const)
    );

    let targetSection: DiffSection | null = null;
    let targetPath: string | null = null;
    if (unstagedPathMap.has(relativePath)) {
      targetSection = 'unstaged';
      targetPath = unstagedPathMap.get(relativePath) ?? null;
    } else if (stagedPathMap.has(relativePath)) {
      targetSection = 'staged';
      targetPath = stagedPathMap.get(relativePath) ?? null;
    }

    if (!targetSection || !targetPath) {
      return;
    }

    if (currentSelectedDiffSection !== targetSection) {
      setSelectedDiffSection(targetSection);
    }
    if (currentSelectedDiffPath !== targetPath) {
      setSelectedDiffPath(targetPath);
    }
  }, [
    cwd,
    isActive,
    normalizeRelativePath,
    resolveDiffPath,
    selectedFilePath,
    stagedEntries,
    toPosix,
    unstagedEntries,
  ]);

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

  const runReverse = async () => {
    if (!cwd || !selectedDiffPath) return;
    setRevertLoading(true);
    try {
      await gitReverseFiles(cwd, [selectedDiffPath], selectedDiffSection === 'staged');
      await refreshGitStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setGitError(message);
    } finally {
      setRevertLoading(false);
    }
  };

  const handleRevertFile = async () => {
    if (!cwd || !selectedDiffPath) return;
    if (!hasConfirmedGitRevert) {
      setRevertConfirmOpen(true);
      return;
    }
    await runReverse();
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
      <GitDiffTopBar
        cwd={cwd}
        gitLoading={gitLoading}
        diffSource={diffSource}
        onDiffSourceChange={setDiffSource}
        selectedDiffSection={selectedDiffSection}
        onDiffSectionChange={setSelectedDiffSection}
        unstagedCount={unstagedEntries.length}
        stagedCount={stagedEntries.length}
        showFileTree={showFileTree}
        onToggleFileTree={() => setShowFileTree((value) => !value)}
        wordWrapEnabled={wordWrapEnabled}
        onToggleWordWrap={() => setWordWrapEnabled((value) => !value)}
        onRefresh={refreshGitStatus}
      />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <GitDiffViewer
          selectedDiffPath={selectedDiffPath}
          selectedDiffSection={selectedDiffSection}
          diffSource={diffSource}
          diffViewCollapsed={diffViewCollapsed}
          wordWrapEnabled={wordWrapEnabled}
          diffMetaLoading={diffMetaLoading}
          diffLoading={diffLoading}
          requiresLargeDiffConfirmation={requiresLargeDiffConfirmation}
          diffMeta={diffMeta}
          diffData={diffData}
          currentDiffKey={currentDiffKey}
          onToggleDiffViewCollapsed={() => setDiffViewCollapsed((value) => !value)}
          onConfirmLargeDiffLoad={setLargeDiffConfirmedKey}
          onRevertFile={() => {
            void handleRevertFile();
          }}
          onStageUnstageCurrentFile={() => {
            void handleStageUnstageCurrentFile();
          }}
          revertLoading={revertLoading}
        />

        {showFileTree && (
          <GitFileTreePanel
            cwd={cwd}
            selectedDiffSection={selectedDiffSection}
            bulkStagePaths={bulkStagePaths}
            bulkStageLoading={bulkStageLoading}
            filterText={filterText}
            gitError={gitError}
            filteredEntriesCount={filteredEntries.length}
            fileTree={fileTree}
            selectedDiffPath={selectedDiffPath}
            collapsedFolders={collapsedFolders}
            onOpenBulkStageDialog={() => setBulkStageDialogOpen(true)}
            onFilterTextChange={setFilterText}
            onToggleFolder={toggleFolder}
            onSelectPath={selectPath}
            onStage={runStage}
            onUnstage={runUnstage}
          />
        )}
        <GitDiffDialogs
          bulkStageDialogOpen={bulkStageDialogOpen}
          bulkStagePathsCount={bulkStagePaths.length}
          bulkStageLoading={bulkStageLoading}
          revertConfirmOpen={revertConfirmOpen}
          revertLoading={revertLoading}
          onBulkStageDialogOpenChange={setBulkStageDialogOpen}
          onRevertConfirmOpenChange={setRevertConfirmOpen}
          onBulkStageConfirm={() => {
            void handleBulkStageConfirm();
          }}
          onRevertConfirm={() => {
            setHasConfirmedGitRevert(true);
            void runReverse();
          }}
        />
      </div>
    </div>
  );
}
