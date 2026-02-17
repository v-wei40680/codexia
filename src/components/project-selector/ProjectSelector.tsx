import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, ChevronDown, Folder, FolderPlus } from 'lucide-react';
import { BrowserProjects, WorkspaceProjects } from '@/components/project-selector';
import { Button } from '@/components/ui/button';
import { Command, CommandInput } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { codexService } from '@/services/codexService';
import {
  canonicalizePath,
  getHomeDirectory,
  readDirectory,
  type TauriFileEntry,
} from '@/services/tauri';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { getFilename } from '@/utils/getFilename';

type SelectorMode = 'workspace' | 'browse';
type TriggerMode = 'label' | 'project-name';

type ProjectSelectorProps = {
  variant?: 'header' | 'hero';
  triggerLabel?: string;
  className?: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialMode?: SelectorMode;
  forcedMode?: SelectorMode;
  triggerMode?: TriggerMode;
  showChevron?: boolean;
  onProjectSelected?: (path: string) => void;
};

export function ProjectSelector({
  variant = 'header',
  triggerLabel,
  className,
  disabled = false,
  open,
  onOpenChange,
  initialMode = 'workspace',
  forcedMode,
  triggerMode = 'label',
  showChevron = false,
  onProjectSelected,
}: ProjectSelectorProps = {}) {
  const { cwd, setCwd, projects, historyProjects, addProject } = useWorkspaceStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const popoverOpen = isControlled ? open : internalOpen;

  const setPopoverOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const [internalMode, setInternalMode] = useState<SelectorMode>(initialMode);
  const mode = forcedMode ?? internalMode;
  const [currentPath, setCurrentPath] = useState('');
  const [homeDir, setHomeDir] = useState('');
  const [entries, setEntries] = useState<TauriFileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const browseInputRef = useRef<HTMLInputElement | null>(null);

  const workspaceProjects = useMemo(() => projects.filter(Boolean), [projects]);

  const triggerText = useMemo(() => {
    if (triggerLabel) {
      return triggerLabel;
    }
    if (triggerMode === 'project-name') {
      const fallback = cwd || projects[0] || historyProjects[0] || '';
      return getFilename(fallback) || fallback || 'Select project folder';
    }
    return variant === 'header'
      ? cwd === '/' || !cwd
        ? 'Select a folder'
        : getFilename(cwd)
      : 'From workspace or add new project';
  }, [triggerLabel, triggerMode, variant, cwd, projects, historyProjects]);

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

  async function handleBrowseDirectory(path: string) {
    setSearch('');
    await loadDirectory(path);
    requestAnimationFrame(() => {
      browseInputRef.current?.focus();
    });
  }

  useEffect(() => {
    if (!popoverOpen) {
      return;
    }
    setSearch('');
    if (!forcedMode) {
      setInternalMode(initialMode);
    }
  }, [popoverOpen, initialMode, forcedMode]);

  useEffect(() => {
    if (!popoverOpen || mode !== 'browse') {
      return;
    }

    const setup = async () => {
      try {
        const home = await getHomeDirectory();
        setHomeDir(home);
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
  }, [popoverOpen, mode, cwd]);

  async function selectProject(path: string) {
    try {
      setSearch('');
      addProject(path);
      setCwd(path);
      await codexService.setCurrentThread(null);
      setPopoverOpen(false);
      onProjectSelected?.(path);
    } catch (e) {
      console.error('Failed to select working directory:', e);
    }
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            variant === 'hero'
              ? 'h-10 gap-2 px-3 text-sm'
              : 'flex max-w-[320px] items-center gap-2 truncate',
            className
          )}
          disabled={disabled}
        >
          {triggerMode === 'label' && <Folder className="h-4 w-4 text-muted-foreground" />}
          <span className="truncate">{triggerText}</span>
          {showChevron && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-fit p-0">
        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 border-b px-2 py-2">
            {mode === 'browse' && (
              <CommandInput
                ref={browseInputRef}
                placeholder="Filter folders..."
                value={search}
                onValueChange={setSearch}
                className="h-8"
              />
            )}
            {!forcedMode &&
              (mode === 'browse' ? (
                <Button variant="ghost" size="sm" onClick={() => setInternalMode('workspace')}>
                  <ArrowLeft className="h-4 w-4" />
                  Workspace
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setInternalMode('browse')}>
                  <FolderPlus className="h-4 w-4" />
                  Add New Project
                </Button>
              ))}
          </div>

          {mode === 'browse' ? (
            <BrowserProjects
              currentPath={currentPath}
              homeDir={homeDir}
              entries={entries}
              isLoading={isLoading}
              search={search}
              error={error}
              onLoadDirectory={handleBrowseDirectory}
              onAddProject={selectProject}
            />
          ) : (
            <WorkspaceProjects
              projects={workspaceProjects}
              cwd={cwd}
              onSelectProject={selectProject}
            />
          )}
        </Command>

        {error && (
          <div className="flex items-center gap-2 border-t bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
