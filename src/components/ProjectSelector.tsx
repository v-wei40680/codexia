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
  Check,
  ChevronRight,
  Download,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Home,
  Image,
  Loader2,
  Monitor,
  MoveUp,
  Music,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

function getQuickAccessName(path: string) {
  const normalized = path.replace(/[\\/]+$/, '');
  return getFilename(normalized) || path;
}

function joinPath(basePath: string, segment: string) {
  const separator = basePath.includes('\\') && !basePath.includes('/') ? '\\' : '/';
  const normalized = basePath.replace(/[\\/]+$/, '');
  return `${normalized}${separator}${segment}`;
}

function buildQuickAccessDirs(home: string) {
  if (!home) {
    return [];
  }

  const quickAccessNames = ['Documents', 'Downloads', 'Pictures', 'Movies', 'Music', 'Desktop'];
  return [home, ...quickAccessNames.map((name) => joinPath(home, name))];
}

function getQuickAccessIcon(folderName: string): LucideIcon {
  const normalized = folderName.toLowerCase();

  if (['documents', 'document', 'docs'].includes(normalized)) {
    return FileText;
  }
  if (['music', 'audio', 'songs'].includes(normalized)) {
    return Music;
  }
  if (['movies', 'movie', 'videos', 'video'].includes(normalized)) {
    return Film;
  }
  if (['downloads', 'download'].includes(normalized)) {
    return Download;
  }
  if (['pictures', 'picture', 'photos', 'photo', 'images', 'image'].includes(normalized)) {
    return Image;
  }
  if (['desktop'].includes(normalized)) {
    return Monitor;
  }
  if (['home'].includes(normalized)) {
    return Home;
  }

  return Folder;
}

export function ProjectSelector() {
  const { cwd, setCwd, projects } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [defaultDirs, setDefaultDirs] = useState<string[]>([]);
  const [entries, setEntries] = useState<TauriFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  function openDirectory(path: string) {
    setSearch('');
    void loadDirectory(path);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="max-w-[300px] truncate flex items-center gap-2">
          <Folder className="w-4 h-4 text-muted-foreground" />
          {cwd === '/' || !cwd ? (
            <span>Working in a folder</span>
          ) : (
            <span className="truncate">{getFilename(cwd)}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-[380px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Filter folders..." value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[320px]">
            {isLoading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading folders...
              </div>
            ) : (
              <>
                {workspaceProjects.length > 0 && (
                  <CommandGroup heading="Workspace Projects">
                    {workspaceProjects.map((projectPath) => (
                      <CommandItem key={projectPath} onSelect={() => void selectCwd(projectPath)}>
                        <Folder className="h-4 w-4" />
                        <span className="truncate flex-1">
                          {getFilename(projectPath) || projectPath}
                        </span>
                        {cwd === projectPath && <Check className="h-4 w-4 text-muted-foreground" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {defaultDirs.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-2 border-t">
                    {defaultDirs.map((dirPath) => {
                      const folderName = getQuickAccessName(dirPath);
                      const QuickAccessIcon = getQuickAccessIcon(folderName);

                      return (
                        <CommandItem
                          key={dirPath}
                          onSelect={() => openDirectory(dirPath)}
                          className="h-8 w-8 justify-center px-0"
                          title={folderName}
                        >
                          <QuickAccessIcon className="h-4 w-4 text-muted-foreground" />
                        </CommandItem>
                      );
                    })}
                  </div>
                )}
                <CommandGroup heading="Current Path">
                  <CommandItem onSelect={() => void selectCwd(currentPath)} disabled={!currentPath}>
                    <Check className="h-4 w-4" />
                    <span className="truncate">{currentPath || 'No folder selected'}</span>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      const parent = getParentPath(currentPath);
                      if (parent) {
                        openDirectory(parent);
                      }
                    }}
                    disabled={!getParentPath(currentPath)}
                  >
                    <MoveUp className="h-4 w-4" />
                    <span>Go to parent folder</span>
                  </CommandItem>
                </CommandGroup>

                <CommandGroup heading="Folders">
                  {directoryEntries.map((entry) => (
                    <CommandItem key={entry.path} onSelect={() => openDirectory(entry.path)}>
                      <FolderOpen className="h-4 w-4" />
                      <span className="truncate flex-1">{entry.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Set as working directory"
                        onClick={(event) => {
                          event.stopPropagation();
                          void selectCwd(entry.path);
                        }}
                      >
                        <Check className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  ))}
                  {!error && directoryEntries.length === 0 && (
                    <CommandEmpty>No folders found</CommandEmpty>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        {(cwd || error) && (
          <div className="border-t px-3 py-2 text-[11px] text-muted-foreground font-mono truncate">
            {error ? error : cwd}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
