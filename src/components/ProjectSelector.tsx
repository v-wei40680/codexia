import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { codexService } from '@/services/codexService';
import {
  canonicalizePath,
  getHomeDirectory,
  readDirectory,
  type TauriFileEntry,
} from '@/services/tauri';
import { getFilename } from '@/utils/getFilename';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Download,
  FileText,
  Film,
  Folder,
  FolderPlus,
  FolderOpen,
  Home,
  Image,
  Loader2,
  Monitor,
  Music,
  Star,
  StarOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

function getParentPath(path: string) {
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

function joinPath(basePath: string, segment: string) {
  const separator = basePath.includes('\\') && !basePath.includes('/') ? '\\' : '/';
  const normalized = basePath.replace(/[\\/]+$/, '');
  return `${normalized}${separator}${segment}`;
}

type QuickAccessDir = {
  name: string;
  path: string;
  icon: LucideIcon;
};

function buildQuickAccessDirs(home: string): QuickAccessDir[] {
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

// Breadcrumb component for current path navigation
function PathBreadcrumb({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  const isWindows = path.includes('\\');
  
  if (!path || path === '/') {
    return (
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
        <Home className="h-3 w-3" />
        <span className="text-xs font-medium">Root</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/30 overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => onNavigate(isWindows ? parts[0] + '\\' : '/')}
      >
        <Home className="h-3 w-3" />
      </Button>
      {parts.map((part, index) => {
        const partPath = isWindows
          ? parts.slice(0, index + 1).join('\\') + '\\'
          : '/' + parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;

        return (
          <div key={partPath} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-xs",
                isLast && "font-medium"
              )}
              onClick={() => onNavigate(partPath)}
            >
              {part}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export function ProjectSelector() {
  const { cwd, setCwd, projects, addProject, removeProject } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [defaultDirs, setDefaultDirs] = useState<QuickAccessDir[]>([]);
  const [entries, setEntries] = useState<TauriFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showBrowse, setShowBrowse] = useState(false);

  const directoryEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.is_directory && entry.name.toLowerCase().includes(search.toLowerCase())
      ),
    [entries, search]
  );
  
  const workspaceProjects = useMemo(() => {
    const keyword = search.toLowerCase().trim();
    const next = projects.filter((projectPath) => {
      if (!projectPath) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const name = getFilename(projectPath).toLowerCase();
      return name.includes(keyword) || projectPath.toLowerCase().includes(keyword);
    });
    return [...new Set(next)];
  }, [projects, search]);

  async function loadDirectory(path: string) {
    setIsLoading(true);
    setError(null);
    setSearch('');
    try {
      const canonicalPath = await canonicalizePath(path);
      const data = await readDirectory(canonicalPath);
      setCurrentPath(canonicalPath);
      setEntries(data);
    } catch (e) {
      console.error('Failed to read directory:', e);
      setError('Unable to read this directory');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    setSearch('');
    setShowBrowse(false);
    const setup = async () => {
      try {
        const home = await getHomeDirectory();
        const quickAccessDirs = buildQuickAccessDirs(home);
        setDefaultDirs(quickAccessDirs);
        const startPath = cwd || home;
        if (startPath) {
          await loadDirectory(startPath);
        }
      } catch (e) {
        console.error('Failed to initialize directory picker:', e);
        setError('Unable to load home directory');
      }
    };
    void setup();
  }, [open, cwd]);

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!open || !showBrowse) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Backspace to go to parent (only if not typing in search)
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
  }, [open, showBrowse, currentPath]);

  async function selectCwd(path: string) {
    try {
      setSearch('');
      setCwd(path);
      await codexService.setCurrentThread(null);
      setOpen(false);
    } catch (e) {
      console.error('Failed to select working directory:', e);
    }
  }

  function toggleProjectInWorkspace(path: string) {
    if (projects.includes(path)) {
      removeProject(path);
    } else {
      addProject(path);
    }
  }

  const isInWorkspace = (path: string) => projects.includes(path);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="max-w-[300px] truncate flex items-center gap-2">
          <Folder className="w-4 h-4 text-muted-foreground" />
          {cwd === '/' || !cwd ? (
            <span>Select a folder</span>
          ) : (
            <span className="truncate">{getFilename(cwd)}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[480px] p-0">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b">
            <CommandInput 
              placeholder={showBrowse ? "Filter folders..." : "Search workspace..."} 
              value={search} 
              onValueChange={setSearch}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={() => setShowBrowse(!showBrowse)}
            >
              {showBrowse ? 'Workspace' : 'Browse'}
            </Button>
          </div>

          {showBrowse ? (
            <>
              <PathBreadcrumb path={currentPath} onNavigate={loadDirectory} />
              <CommandList className="max-h-[360px]">
                {isLoading ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading folders...
                  </div>
                ) : (
                  <>
                    {defaultDirs.length > 0 && !search && (
                      <CommandGroup heading="Quick Access">
                        <div className="grid grid-cols-7 gap-1 p-2">
                          {defaultDirs.map(({ name, path, icon: Icon }) => {
                            return (
                              <Button
                                key={path}
                                variant="ghost"
                                size="sm"
                                onClick={() => void loadDirectory(path)}
                                className="h-16 flex flex-col items-center justify-center gap-1 p-2"
                                title={path}
                              >
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span className="text-[10px] truncate w-full text-center">
                                  {name}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </CommandGroup>
                    )}

                    <CommandGroup heading="Folders">
                      {directoryEntries.map((entry) => {
                        const inWorkspace = isInWorkspace(entry.path);
                        return (
                          <CommandItem
                            key={entry.path}
                            onSelect={() => void loadDirectory(entry.path)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <FolderOpen className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate flex-1">{entry.name}</span>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0"
                                title={inWorkspace ? "Remove from workspace" : "Add to workspace"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProjectInWorkspace(entry.path);
                                }}
                              >
                                {inWorkspace ? (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ) : (
                                  <StarOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0"
                                title="Select as working directory"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void selectCwd(entry.path);
                                }}
                              >
                                <Check className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </CommandItem>
                        );
                      })}
                      {!error && directoryEntries.length === 0 && (
                        <CommandEmpty>No folders found</CommandEmpty>
                      )}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </>
          ) : (
            <CommandList className="max-h-[400px]">
              {workspaceProjects.length > 0 ? (
                <CommandGroup heading="Workspace Projects">
                  {workspaceProjects.map((projectPath) => {
                    const isSelected = cwd === projectPath;
                    return (
                      <CommandItem
                        key={projectPath}
                        onSelect={() => void selectCwd(projectPath)}
                        className="flex items-center gap-2"
                      >
                        <Folder className={cn(
                          "h-4 w-4 flex-shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className="truncate flex-1">
                          {getFilename(projectPath) || projectPath}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          title="Remove from workspace"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeProject(projectPath);
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ) : (
                <div className="p-8 text-center">
                  <Star className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mb-1">No workspace projects yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Star folders while browsing to add them to your workspace
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBrowse(true)}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Browse Folders
                  </Button>
                </div>
              )}
            </CommandList>
          )}
        </Command>
        {error && (
          <div className="border-t px-3 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
        {!error && cwd && !showBrowse && (
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground font-mono truncate">
            Current: {cwd}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
