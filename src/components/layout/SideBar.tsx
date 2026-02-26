import {
  BookOpen,
  ChevronRight,
  Ellipsis,
  FolderPlus,
  ListFilter,
  Package,
  PanelLeft,
  ScrollText,
  SquarePen,
  Timer,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useLayoutStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserInfo } from './UserInfo';
import { ThreadList } from '@/components/codex/ThreadList';
import { useThreadList } from '@/hooks/codex';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSettingsStore } from '@/stores/settings';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useUpdater } from '@/hooks/useUpdater';
import { ClaudeCodeSessionList } from '../cc/SessionList';
import { UpdateButton } from '../features/UpdateButton';
import { getFilename } from '@/utils/getFilename';
import { getSessions, SessionData } from '@/lib/sessions';
import { useCCStore } from '@/stores/ccStore';
import { isTauri } from '@/hooks/runtime';

export function SideBar() {
  const {
    cwd,
    setCwd,
    selectedAgent,
    setSelectedAgent,
    projects,
    addProject,
    removeProject,
    setInstructionType,
  } =
    useWorkspaceStore();
  const {
    isSidebarOpen,
    setSidebarOpen,
    setView,
    view,
    activeSidebarTab,
    setActiveSidebarTab,
  } = useLayoutStore();
  const { searchTerm, setSearchTerm, sortKey, setSortKey, handleNewThread } = useThreadList();
  const { handleSessionSelect, handleNewSession } = useCCSessionManager();
  const { activeSessionId } = useCCStore();
  const { showSidebarMarketplace } = useSettingsStore();
  const { hasUpdate, startUpdate } = useUpdater({ enabled: true });
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [ccSessions, setCcSessions] = useState<SessionData[]>([]);
  const [ccLoading, setCcLoading] = useState(false);
  const [ccError, setCcError] = useState<string | null>(null);
  const sortedProjects = useMemo(() => projects, [projects]);
  const currentThreadSortLabel = sortKey === 'created_at' ? 'Created' : 'Updated';

  const loadCcSessions = useCallback(async () => {
    setCcLoading(true);
    setCcError(null);
    try {
      const sessions = await getSessions();
      setCcSessions(sessions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sessions';
      setCcError(message);
    } finally {
      setCcLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSidebarTab !== 'cc') {
      return;
    }
    void loadCcSessions();
  }, [activeSessionId, activeSidebarTab, loadCcSessions]);

  useEffect(() => {
    if (activeSidebarTab !== 'cc') {
      return;
    }

    const debounceMs = 150;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        void loadCcSessions();
      }, debounceMs);
    };

    if (isTauri()) {
      let unlisten: (() => void) | null = null;
      void listen('session/list-updated', scheduleReload).then((dispose) => {
        unlisten = dispose;
      });
      return () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        unlisten?.();
      };
    }

    window.addEventListener('session/list-updated', scheduleReload);
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      window.removeEventListener('session/list-updated', scheduleReload);
    };
  }, [activeSidebarTab, loadCcSessions]);

  useEffect(() => {
    if (activeSidebarTab === 'explorer') {
      setActiveSidebarTab(selectedAgent === 'cc' ? 'cc' : 'codex');
    }
  }, [activeSidebarTab, selectedAgent, setActiveSidebarTab]);

  const handleCreateNew = useCallback(async (project?: string) => {
    if (project && project !== cwd) {
      setCwd(project);
    }

    if (selectedAgent === 'cc') {
      setActiveSidebarTab('cc');
      setView('cc');
      await handleNewSession();
      return;
    }
    await handleNewThread();
  }, [cwd, handleNewSession, handleNewThread, selectedAgent, setActiveSidebarTab, setCwd, setView]);

  const handleAddProject = useCallback(async () => {
    const projectPath = await open({
      directory: true,
      multiple: false,
    });

    if (!projectPath || Array.isArray(projectPath)) {
      return;
    }
    addProject(projectPath);
  }, [addProject]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      if (target.isContentEditable) {
        return true;
      }
      const tagName = target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        return true;
      }
      return Boolean(target.closest('[contenteditable="true"]'));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isNewShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n';

      if (!isNewShortcut || event.shiftKey || event.altKey || event.repeat) {
        return;
      }

      if (view !== 'codex' && view !== 'cc') {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void handleCreateNew();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCreateNew, view]);

  return (
    <div className="flex h-full w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] max-w-[var(--sidebar-width)] flex-col border-r border-sidebar-border bg-zinc-100/95 dark:bg-zinc-900/95">
      <div className="gap-1 p-2 flex flex-col">
        <div className="flex items-center gap-2 pl-20" data-tauri-drag-region>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <UpdateButton
            hasUpdate={hasUpdate}
            onUpdate={startUpdate}
          />
        </div>
        <Input
          placeholder="Search threads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
        />
        <div className="flex flex-col">
          <Button
            variant="ghost"
            onClick={() => {
              void handleCreateNew();
            }}
            size="sm"
            className="h-8 justify-start gap-1.5 pl-0 pr-2 has-[>svg]:pl-0"
          >
            <SquarePen className="h-4 w-4" /> {selectedAgent === 'cc' ? 'New Session' : 'New Thread'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 justify-start gap-1.5 rounded-md border pl-0 pr-2 has-[>svg]:pl-0 ${view === 'automations'
              ? 'border-border bg-accent/70 text-foreground'
              : 'border-transparent hover:border-border/60'
              }`}
            onClick={() => setView('automations')}
          >
            <Timer className="h-4 w-4" />
            Automations
          </Button>
          {showSidebarMarketplace && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 justify-start gap-1.5 rounded-md border pl-0 pr-2 has-[>svg]:pl-0 ${view === 'marketplace'
                ? 'border-border bg-accent/70 text-foreground'
                : 'border-transparent hover:border-border/60'
                }`}
              onClick={() => setView('marketplace')}
            >
              <Package className="h-4 w-4" /> Skills | MCP | Prompt
            </Button>
          )}
        </div>
        <span className="flex justify-between">
          <span className="flex">
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${activeSidebarTab === 'codex' ? 'bg-accent' : ''}`}
              onClick={() => {
                setSelectedAgent('codex');
                setActiveSidebarTab('codex');
              }}
            >
              codex
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${activeSidebarTab === 'cc' ? 'bg-accent' : ''}`}
              onClick={() => {
                setSelectedAgent('cc');
                setActiveSidebarTab('cc');
              }}
            >
              cc
            </Button>
          </span>
          <span className="flex">
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Add new project" onClick={handleAddProject}>
              <FolderPlus className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title={`Filter threads (current: ${currentThreadSortLabel})`}
                >
                  <ListFilter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup
                  value={sortKey}
                  onValueChange={(value) => setSortKey(value as 'created_at' | 'updated_at')}
                >
                  <DropdownMenuRadioItem value="created_at">Sort by Created</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="updated_at">Sort by Updated</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </span>
      </div>

      <div className="min-h-0 min-w-0 max-w-full overflow-x-hidden flex flex-1 flex-col gap-2">
        <ScrollArea className="flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden [&>[data-radix-scroll-area-viewport]]:overflow-x-hidden [&>[data-radix-scroll-area-viewport]>div]:!block [&>[data-radix-scroll-area-viewport]>div]:!w-full [&>[data-radix-scroll-area-viewport]>div]:min-w-0">
          {activeSidebarTab === 'codex' && (
            <div className="flex min-h-0 w-full flex-col gap-2 px-2 pb-2">
              {sortedProjects.map((project) => (
                <Collapsible
                  key={project}
                  open={expandedProjects[project] ?? true}
                  onOpenChange={(open) =>
                    setExpandedProjects((prev) => ({ ...prev, [project]: open }))
                  }
                >
                  <div
                    className={`flex items-center gap-1 rounded-t-lg text-xs transition-colors ${cwd === project
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                      }`}
                    title={project}
                  >
                    <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-1 text-left">
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 transition-transform ${(expandedProjects[project] ?? true) ? 'rotate-90' : ''}`}
                      />
                      <span className="truncate font-medium">
                        {getFilename(project) || project}
                      </span>
                    </CollapsibleTrigger>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title={`Project actions for ${getFilename(project) || project}`}
                          className="shrink-0"
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => removeProject(project)}>
                          <X /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title={`Set Agent Instructions`}
                      onClick={() => {
                        setCwd(project);
                        setView('agents');
                        setInstructionType('project');
                      }}
                      className="shrink-0"
                    >
                      <ScrollText />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title={`Start new thread in ${getFilename(project) || project}`}
                      onClick={() => {
                        void handleCreateNew(project);
                      }}
                      className="shrink-0"
                    >
                      <SquarePen />
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <ThreadList cwdOverride={project} />
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {sortedProjects.length === 0 && (
                <div className="rounded-lg border border-sidebar-border bg-sidebar/30 px-3 py-3 text-xs text-muted-foreground">
                  No projects yet.
                </div>
              )}
            </div>
          )}
          {activeSidebarTab === 'cc' && (
            <div className="flex min-h-0 w-full flex-col">
              {ccLoading && (
                <div className="rounded-lg border border-sidebar-border bg-sidebar/30 px-3 py-3 text-xs text-muted-foreground">
                  Loading sessions...
                </div>
              )}
              {ccError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                  Error: {ccError}
                </div>
              )}
              {!ccLoading &&
                !ccError &&
                sortedProjects.map((project) => (
                  <Collapsible
                    key={project}
                    open={expandedProjects[project] ?? true}
                    onOpenChange={(open) =>
                      setExpandedProjects((prev) => ({ ...prev, [project]: open }))
                    }
                    className="rounded-lg border border-sidebar-border bg-sidebar/30"
                  >
                    <div
                      className={`flex items-center gap-1 rounded-t-lg px-2 py-1.5 text-xs transition-colors ${cwd === project
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                        }`}
                      title={project}
                    >
                      <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-1 text-left">
                        <ChevronRight
                          className={`h-3.5 w-3.5 shrink-0 transition-transform ${(expandedProjects[project] ?? true) ? 'rotate-90' : ''}`}
                        />
                        <span className="truncate font-medium">{getFilename(project) || project}</span>
                      </CollapsibleTrigger>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title={`Project actions for ${getFilename(project) || project}`}
                            className="shrink-0"
                          >
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => removeProject(project)}>
                            Remove project from workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title={`Set Agent Instructions`}
                        onClick={() => {
                          setCwd(project);
                          setView('agents');
                          setInstructionType('project');
                        }}
                        className="shrink-0"
                      >
                        <ScrollText />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title={`Start new session in ${getFilename(project) || project}`}
                        onClick={async () => {
                          setSelectedAgent('cc');
                          setActiveSidebarTab('cc');
                          setView('cc');
                          setCwd(project);
                          await handleNewSession();
                        }}
                        className="shrink-0"
                      >
                        <SquarePen />
                      </Button>
                    </div>
                    <CollapsibleContent>
                      <ClaudeCodeSessionList
                        project={project}
                        sessions={ccSessions}
                        onSelectSession={handleSessionSelect}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              {!ccLoading && !ccError && sortedProjects.length === 0 && (
                <div className="rounded-lg border border-sidebar-border bg-sidebar/30 px-3 py-3 text-xs text-muted-foreground">
                  No projects yet.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="min-h-0 min-w-0 max-w-full overflow-x-hidden flex justify-between items-center gap-2">
        <UserInfo />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="open learn view"
          onClick={() => {
            setView('learn');
          }}
        >
          <BookOpen className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
