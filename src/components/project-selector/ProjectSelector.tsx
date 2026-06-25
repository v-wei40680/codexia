import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown, Folder, FolderPlus } from 'lucide-react';
import { BrowserProjects, WorkspaceProjects } from '@/components/project-selector';
import { Button } from '@/components/ui/button';
import { Command, CommandInput } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { codexService } from '@/services/codexService';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { getFilename } from '@/utils/getFilename';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { isDesktopTauri } from '@/hooks/runtime';

type SelectorMode = 'workspace' | 'browse';
type TriggerMode = 'label' | 'project-name';

type ProjectSelectorProps = {
  variant?: 'header' | 'hero';
  triggerLabel?: string;
  className?: string;
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
  const [search, setSearch] = useState('');
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

  useEffect(() => {
    if (!popoverOpen) {
      return;
    }
    setSearch('');
    if (!forcedMode) {
      setInternalMode(initialMode);
    }
  }, [popoverOpen, initialMode, forcedMode]);

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

  async function handleAddProject() {
    if (isDesktopTauri()) {
      const selected = await openDialog({ directory: true, multiple: false });
      if (typeof selected === 'string') {
        await selectProject(selected);
      }
    } else {
      setInternalMode('browse');
    }
  }

  return (
    <DropdownMenu open={popoverOpen} onOpenChange={setPopoverOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            variant === 'hero'
              ? 'h-10 gap-2 px-3 text-sm'
              : 'flex max-w-[320px] items-center gap-2 truncate',
            className
          )}
        >
          {triggerMode === 'label' && <Folder className="h-4 w-4 text-muted-foreground" />}
          <span className="truncate">{triggerText}</span>
          {showChevron && <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-fit p-0">
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
                <Button variant="ghost" size="sm" onClick={() => void handleAddProject()}>
                  <FolderPlus className="h-4 w-4" />
                  Add New Project
                </Button>
              ))}
          </div>

          {mode === 'browse' ? (
            <BrowserProjects
              onAddProject={selectProject}
              cwd={cwd}
            />
          ) : (
            <WorkspaceProjects
              projects={workspaceProjects}
              cwd={cwd}
              onSelectProject={selectProject}
            />
          )}
        </Command>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
