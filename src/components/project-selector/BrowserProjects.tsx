import { useEffect, useMemo } from 'react';
import {
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
import { CommandList } from '@/components/ui/command';
import { type TauriFileEntry } from '@/services/tauri';

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

type BrowserProjectsProps = {
  currentPath: string;
  homeDir: string;
  entries: TauriFileEntry[];
  isLoading: boolean;
  search: string;
  error: string | null;
  onLoadDirectory: (path: string) => void | Promise<void>;
  onAddProject: (path: string) => void | Promise<void>;
};

export function BrowserProjects({
  currentPath,
  homeDir,
  entries,
  isLoading,
  search,
  error,
  onLoadDirectory,
  onAddProject,
}: BrowserProjectsProps) {
  const parentPath = useMemo(() => getParentPath(currentPath), [currentPath]);
  const currentFolderName = useMemo(() => getCurrentFolderName(currentPath), [currentPath]);
  const defaultDirs = useMemo(() => buildQuickAccessDirs(homeDir), [homeDir]);
  const directoryEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.is_directory && entry.name.toLowerCase().includes(search.toLowerCase())
      ),
    [entries, search]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && (e.target as HTMLElement).tagName !== 'INPUT') {
        const parent = getParentPath(currentPath);
        if (parent) {
          e.preventDefault();
          void onLoadDirectory(parent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, onLoadDirectory]);

  return (
    <>
      {defaultDirs.length > 0 && !search && (
        <div className="flex items-center gap-1 border-b px-2 py-1">
          {defaultDirs.map(({ path, icon: Icon }) => (
            <Button
              key={path}
              variant="ghost"
              size="sm"
              onClick={() => void onLoadDirectory(path)}
              title={path}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-b">
        <Button
          variant="ghost"
          size="icon"
          disabled={!parentPath}
          onClick={() => {
            if (parentPath) {
              void onLoadDirectory(parentPath);
            }
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
      <CommandList className="max-h-[360px]">
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
                  onClick={() => void onLoadDirectory(entry.path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void onLoadDirectory(entry.path);
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
              {!error && directoryEntries.length === 0 && (
                <div className="px-2 py-2 text-sm text-muted-foreground">No folders found</div>
              )}
            </div>
          </>
        )}
      </CommandList>
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
