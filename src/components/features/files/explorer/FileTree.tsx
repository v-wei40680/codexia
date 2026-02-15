import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { useLayoutStore, useWorkspaceStore } from '@/stores';
import { useInputStore } from '@/stores';
import { Button } from '@/components/ui/button';
import {
  canonicalizePath,
  readDirectory,
  searchFiles,
  type TauriFileEntry,
} from '@/services/tauri';
import { getFilename } from '@/utils/getFilename';
import { FileTreeHeader } from './FileTreeHeader';

type FileNode = {
  name: string;
  path: string;
  kind: 'file' | 'dir' | 'symlink';
  children?: FileNode[];
};

type FileTreeProps = {
  folder: string;
  onFileSelect?: (path: string) => void;
};

const getExtension = (name: string) => {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) {
    return '';
  }
  return name.slice(idx + 1).toLowerCase();
};

const sortNodes = (nodes: FileNode[]) =>
  nodes.slice().sort((a, b) => {
    if (a.kind !== b.kind) {
      return a.kind === 'dir' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

const normalizeName = (name: string) => name.replace(/^\.+/, '').toLowerCase();
const shouldSkipEntry = (name: string, hiddenSet: Set<string>) =>
  name === '.git' || hiddenSet.has(normalizeName(name));

const buildSearchTree = (rootNode: FileNode, matches: TauriFileEntry[]): FileNode => {
  const pathSeparator = rootNode.path.includes('\\') ? '\\' : '/';
  const treeRoot: FileNode = {
    name: rootNode.name,
    path: rootNode.path,
    kind: 'dir',
    children: [],
  };
  const nodeMap = new Map<string, FileNode>([[treeRoot.path, treeRoot]]);

  for (const match of matches) {
    if (!match.path.startsWith(rootNode.path)) {
      continue;
    }

    const relativePath = match.path.slice(rootNode.path.length).replace(/^[/\\]/, '');
    if (!relativePath) {
      continue;
    }

    const segments = relativePath.split(/[/\\]+/).filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    let currentPath = rootNode.path;
    let parent = treeRoot;

    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i];
      const isLeaf = i === segments.length - 1;
      currentPath = `${currentPath}${currentPath.endsWith(pathSeparator) ? '' : pathSeparator}${segment}`;

      const existingNode = nodeMap.get(currentPath);
      if (existingNode) {
        parent = existingNode;
        continue;
      }

      const childNode: FileNode = {
        name: segment,
        path: isLeaf ? match.path : currentPath,
        kind: isLeaf ? (match.is_directory ? 'dir' : 'file') : 'dir',
        children: isLeaf && !match.is_directory ? undefined : [],
      };

      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(childNode);
      nodeMap.set(currentPath, childNode);
      parent = childNode;
    }
  }

  const sortTree = (node: FileNode): FileNode => {
    if (!node.children) {
      return node;
    }

    return {
      ...node,
      children: sortNodes(node.children).map((child) => sortTree(child)),
    };
  };

  return sortTree(treeRoot);
};

export function FileTree({ folder, onFileSelect }: FileTreeProps) {
  const [root, setRoot] = useState<FileNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchMatches, setSearchMatches] = useState<TauriFileEntry[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hiddenNames } = useSettingsStore();
  const { setRightPanelOpen, setActiveRightPanelTab } = useLayoutStore();
  const { setSelectedFilePath } = useWorkspaceStore();
  const { appendInputValue } = useInputStore();
  const hiddenSet = useMemo(
    () => new Set(hiddenNames.map((name) => normalizeName(name))),
    [hiddenNames]
  );

  const listDir = useCallback(
    async (dir: string): Promise<FileNode[]> => {
      const resolvedDir = await canonicalizePath(dir);
      const entries = await readDirectory(resolvedDir);
      const nodes = entries
        .filter((entry) => !shouldSkipEntry(entry.name, hiddenSet))
        .map((entry) => ({
          name: entry.name,
          path: entry.path,
          kind: entry.is_directory ? ('dir' as const) : ('file' as const),
        }));
      return sortNodes(nodes);
    },
    [hiddenSet]
  );

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!folder) {
        if (isActive) {
          setRoot(null);
          setExpanded(new Set());
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const resolvedFolder = await canonicalizePath(folder);
        const label = getFilename(resolvedFolder);
        const children = await listDir(resolvedFolder);
        if (isActive) {
          setRoot({ name: label || folder, path: resolvedFolder, kind: 'dir', children });
          setExpanded(new Set([resolvedFolder]));
        }
      } catch (err) {
        if (isActive) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message || 'Failed to read folder.');
          setRoot(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [folder, listDir, refreshKey]);

  useEffect(() => {
    setFilterText('');
    setSearchError(null);
    setSearchMatches([]);
  }, [folder]);

  const normalizedFilterText = filterText.trim().toLowerCase();
  const isSearching = normalizedFilterText.length > 0;

  useEffect(() => {
    let isActive = true;

    if (!isSearching || !folder) {
      setSearching(false);
      setSearchError(null);
      setSearchMatches([]);
      return () => {
        isActive = false;
      };
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);

      try {
        const searchRoot = root?.path ?? (await canonicalizePath(folder));
        const matches = await searchFiles({
          root: searchRoot,
          query: normalizedFilterText,
          excludeFolders: hiddenNames,
          maxResults: 2000,
        });

        if (isActive) {
          setSearchMatches(matches);
        }
      } catch (err) {
        if (isActive) {
          const message = err instanceof Error ? err.message : String(err);
          setSearchError(message || 'Search failed.');
          setSearchMatches([]);
        }
      } finally {
        if (isActive) {
          setSearching(false);
        }
      }
    }, 200);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [folder, hiddenNames, isSearching, normalizedFilterText, root?.path]);

  const displayRoot = useMemo(() => {
    if (!root) {
      return null;
    }

    if (!isSearching) {
      return root;
    }

    return buildSearchTree(root, searchMatches);
  }, [isSearching, root, searchMatches]);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const updateChildren = (node: FileNode, targetPath: string, children: FileNode[]): FileNode => {
    if (node.path === targetPath) {
      return { ...node, children };
    }
    if (!node.children) {
      return node;
    }
    return {
      ...node,
      children: node.children.map((child) => updateChildren(child, targetPath, children)),
    };
  };

  const loadChildren = async (node: FileNode) => {
    if (node.kind !== 'dir' || node.children) {
      return;
    }
    setLoadingNodes((prev) => new Set(prev).add(node.path));
    try {
      const children = await listDir(node.path);
      setRoot((prev) => (prev ? updateChildren(prev, node.path, children) : prev));
    } catch (err) {
      console.warn('Failed to read subdirectory', node.path, err);
    } finally {
      setLoadingNodes((prev) => {
        const next = new Set(prev);
        next.delete(node.path);
        return next;
      });
    }
  };

  const isLatexFile = (ext: string) => ['tex', 'latex', 'ltx'].includes(ext);
  const isPdfFile = (ext: string) => ext === 'pdf';
  const isOfficeFile = (ext: string) => ['docx', 'xlsx', 'xls', 'pptx'].includes(ext);

  const renderNode = (node: FileNode, depth: number) => {
    const rootPath = root?.path;
    const relativePath =
      rootPath && node.path.startsWith(rootPath)
        ? node.path.slice(rootPath.length).replace(/^[/\\]/, '') || '.'
        : node.path;
    const isDir = node.kind === 'dir';
    const isRoot = root?.path === node.path;
    const isExpanded = isSearching ? true : expanded.has(node.path);
    const isLoadingChildren = loadingNodes.has(node.path);
    const extension = getExtension(node.name);
    const iconStyle =
      extension && extension in defaultStyles
        ? defaultStyles[extension as keyof typeof defaultStyles]
        : defaultStyles.txt;

    return (
      <div key={node.path}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (isDir) {
              if (!isExpanded && !node.children) {
                void loadChildren(node);
              }
              toggle(node.path);
              return;
            }

            setSelectedFilePath(node.path);
            if (onFileSelect) {
              onFileSelect(node.path);
              return;
            }
            if (isLatexFile(extension) || isPdfFile(extension)) {
              setRightPanelOpen(true);
              setActiveRightPanelTab('files');
            } else if (isOfficeFile(extension)) {
              setRightPanelOpen(true);
              setActiveRightPanelTab('files');
            } else {
              setRightPanelOpen(true);
              setActiveRightPanelTab('files');
            }
          }}
          className="group/file-row flex w-full items-center gap-2 rounded-md px-2 py-1 pr-3 text-left text-sm hover:bg-accent"
          style={{ paddingLeft: depth * 12 }}
        >
          {isDir ? (
            <span className="relative h-4 w-4 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              {!isRoot ? (
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    appendInputValue(`[${node.name}](${relativePath})`);
                  }}
                  variant="ghost"
                  size="icon"
                  title={`Insert ${node.name}`}
                  className="absolute inset-0 h-4 w-4 min-h-0 min-w-0 rounded-sm border border-border bg-background p-0 text-foreground opacity-0 transition-opacity group-hover/file-row:opacity-100"
                  aria-label={`Insert ${node.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </span>
          ) : (
            <span className="w-4" />
          )}
          {!isDir && (
            <span className="relative h-4 w-4 shrink-0">
              <FileIcon extension={extension} {...iconStyle} />
              {!isRoot ? (
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    appendInputValue(`[${node.name}](${relativePath})`);
                  }}
                  variant="ghost"
                  size="icon"
                  title={`Insert ${node.name}`}
                  className="absolute inset-0 h-4 w-4 min-h-0 min-w-0 rounded-none p-0 text-muted-foreground opacity-0 transition-opacity group-hover/file-row:opacity-100"
                  aria-label={`Insert ${node.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </span>
          )}
          <span className="whitespace-nowrap">{node.name}</span>
          {isDir && isLoadingChildren ? (
            <span className="ml-auto text-xs text-muted-foreground">Loading...</span>
          ) : null}
        </div>
        {isDir && isExpanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!folder) {
    return <div className="text-sm text-muted-foreground">No folder selected.</div>;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <FileTreeHeader
          currentFolder={folder}
          filterText={filterText}
          onFilterTextChange={setFilterText}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />
        <div className="text-sm text-muted-foreground">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <FileTreeHeader
          currentFolder={folder}
          filterText={filterText}
          onFilterTextChange={setFilterText}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />
        <div className="text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (!displayRoot) {
    return (
      <div className="space-y-2">
        <FileTreeHeader
          currentFolder={folder}
          filterText={filterText}
          onFilterTextChange={setFilterText}
          onRefresh={() => setRefreshKey((prev) => prev + 1)}
        />
        <div className="text-sm text-muted-foreground">No files found.</div>
      </div>
    );
  }

  const visibleNodes = displayRoot.children ?? [];
  const hasSearchResults = visibleNodes.length > 0;

  return (
    <div className="max-h-full min-w-0 max-w-full overflow-y-auto overflow-x-auto">
      <FileTreeHeader
        currentFolder={folder}
        filterText={filterText}
        onFilterTextChange={setFilterText}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
      />
      {isSearching && searching ? (
        <div className="text-sm text-muted-foreground">Searching...</div>
      ) : null}
      {isSearching && searchError ? (
        <div className="text-sm text-destructive">{searchError}</div>
      ) : null}
      {isSearching && !searching && !searchError && !hasSearchResults ? (
        <div className="text-sm text-muted-foreground">No matching files or folders.</div>
      ) : null}
      {(!isSearching || hasSearchResults) && (
        <div className="space-y-1">{visibleNodes.map((child) => renderNode(child, 0))}</div>
      )}
    </div>
  );
}
