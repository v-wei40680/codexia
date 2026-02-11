import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings';
import { useLayoutStore, useWorkspaceStore } from '@/stores';
import { useInputStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { canonicalizePath, readDirectory } from '@/services/tauri';
import { getFilename } from '@/utils/getFilename';

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

export function FileTree({ folder, onFileSelect }: FileTreeProps) {
  const [root, setRoot] = useState<FileNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
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

    if (folder) {
      load();
    } else {
      setRoot(null);
      setExpanded(new Set());
    }

    return () => {
      isActive = false;
    };
  }, [folder, listDir]);

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
    const isExpanded = expanded.has(node.path);
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
            isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
          {!isDir && (
            <span className="h-4 w-4 shrink-0">
              <FileIcon extension={extension} {...iconStyle} />
            </span>
          )}
          <span className="whitespace-nowrap">{node.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {isDir && isLoadingChildren ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : null}
            {!isRoot ? (
              <Button
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  appendInputValue(relativePath);
                }}
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground opacity-0 group-hover/file-row:opacity-100 transition-opacity"
                aria-label={`Insert ${node.name}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
        {isDir &&
          isExpanded &&
          node.children
            ?.filter((child) => !shouldSkipEntry(child.name, hiddenSet))
            .map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!folder) {
    return <div className="text-sm text-muted-foreground">No folder selected.</div>;
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading files...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (!root) {
    return <div className="text-sm text-muted-foreground">No files found.</div>;
  }

  return (
    <div className="space-y-1 max-h-full min-w-0 max-w-full overflow-y-auto overflow-x-auto">
      {renderNode(root, 0)}
    </div>
  );
}
