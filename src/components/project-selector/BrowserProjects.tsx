import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  Download,
  FileText,
  Film,
  FolderOpen,
  FolderPlus,
  Home,
  Image,
  Loader2,
  Monitor,
  Music,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type TauriFileEntry, canonicalizePath, getHomeDirectory, readDirectory } from '@/services/tauri';

function getParentPath(path: string): string | null {
  const normalized = path.replace(/[\\/]+$/, '');
  if (!normalized) {
    return null;
  }
  const parts = normalized.split(/[\\/]+/);
  if (parts.length <= 1) {
    return null;
  }
  if (normalized.startsWith('/')) {
    return `/${parts.slice(1, -1).join('/')}` || '/';
  }
  return parts.slice(0, -1).join('\\') || null;
}

function getCurrentFolderName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '');
  if (!normalized || normalized === '/' || /^[a-zA-Z]:$/.test(normalized)) {
    return 'Root';
  }
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || 'Root';
}

export type QuickAccessDir = {
  name: string;
  path: string;
  icon: LucideIcon;
};

interface BrowserProjectsProps {
  onAddProject: (path: string) => void;
  cwd: string | null;
  onGoBack?: () => void;
}

export function BrowserProjects({ onAddProject, cwd, onGoBack }: BrowserProjectsProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [homeDir, setHomeDir] = useState('');
  const [entries, setEntries] = useState<TauriFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  if (!cwd) return
  const loadDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const canonicalPath = await canonicalizePath(path);
      const data = await readDirectory(canonicalPath);
      setCurrentPath(canonicalPath);
      setEntries(data);
    } catch {
      // ignore read errors
    } finally {
      setIsLoading(false);
    }
  }, [cwd]);

  // Initialize: load homeDir and start from cwd or home
  useEffect(() => {
    void (async () => {
      const home = await getHomeDirectory();
      setHomeDir(home);
      await loadDirectory(cwd || home);
    })();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const parentPath = useMemo(() => getParentPath(currentPath), [currentPath]);
  const currentFolderName = useMemo(() => getCurrentFolderName(currentPath), [currentPath]);
  const defaultDirs = useMemo(() => buildQuickAccessDirs(homeDir), [homeDir]);
  const directoryEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.is_dir && entry.name.toLowerCase().includes(search.toLowerCase())
      ),
    [entries, search]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && (e.target as HTMLElement).tagName !== 'INPUT') {
        const parent = getParentPath(currentPath);
        if (parent) {
          e.preventDefault();
          void loadDirectory(parent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, loadDirectory]);

  return (
    <>
      {defaultDirs.length > 0 && !search && (
        <div className="flex items-center gap-1 border-b px-2 py-1">
          {defaultDirs.map(({ path, icon: Icon }) => (
            <Button
              key={path}
              variant="ghost"
              size="sm"
              onClick={() => void loadDirectory(path)}
              title={path}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}
      {onGoBack ? (
        <div className="flex items-center gap-2 border-b px-2 py-2">
          <Button variant="ghost" size="icon" onClick={onGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Filter folders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-base"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 border-b">
          <Button
            variant="ghost"
            size="icon"
            disabled={!parentPath}
            onClick={() => {
              if (parentPath) void loadDirectory(parentPath);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="truncate text-sm font-medium" title={currentPath || 'Root'}>
            {currentFolderName}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 px-2"
            disabled={!currentPath}
            onClick={() => {
              if (currentPath) {
                void onAddProject(currentPath);
              }
            }}
          >
            <FolderPlus className="h-4 w-4" />
            Set
          </Button>
        </div>
      )}
      <div className="max-h-[360px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading folders...
          </div>
        ) : (
          <>
            <div className="p-1">
              {directoryEntries.map((entry) => (
                <div
                  key={entry.path}
                  onClick={() => void loadDirectory(entry.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void loadDirectory(entry.path);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{entry.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onAddProject(entry.path);
                    }}
                  >
                    <FolderPlus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
              ))}
              {directoryEntries.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">No folders found</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function joinPath(basePath: string, segment: string): string {
  const separator = basePath.includes('\\') && !basePath.includes('/') ? '\\' : '/';
  const normalized = basePath.replace(/[\\/]+$/, '');
  return `${normalized}${separator}${segment}`;
}

export function buildQuickAccessDirs(home: string): QuickAccessDir[] {
  if (!home) {
    return [];
  }

  return [
    { name: 'Home', path: home, icon: Home },
    { name: 'Desktop', path: joinPath(home, 'Desktop'), icon: Monitor },
    { name: 'Documents', path: joinPath(home, 'Documents'), icon: FileText },
    { name: 'Movies', path: joinPath(home, 'Movies'), icon: Film },
    { name: 'Music', path: joinPath(home, 'Music'), icon: Music },
    { name: 'Pictures', path: joinPath(home, 'Pictures'), icon: Image },
    { name: 'Downloads', path: joinPath(home, 'Downloads'), icon: Download },
  ];
}
