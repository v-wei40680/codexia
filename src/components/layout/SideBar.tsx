import {
  ChevronRight,
  FolderPlus,
  ListFilter,
  Package,
  PanelLeft,
  ScrollText,
  SquarePen,
  Terminal,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { useLayoutStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserInfo } from './UserInfo';
import { ThreadList } from '@/components/codex/ThreadList';
import { useThreadList } from '@/hooks/codex';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useUpdater } from '@/hooks/useUpdater';
import { ClaudeCodeSessionList } from '../cc/SessionList';
import { FileTree } from '../features/files/explorer';
import { UpdateButton } from '../features/UpdateButton';
import { getFilename } from '@/utils/getFilename';

export function SideBar() {
  const { cwd, setCwd, setSelectedAgent, projects, addProject, setInstructionType } =
    useWorkspaceStore();
  const {
    isSidebarOpen,
    setSidebarOpen,
    setView,
    activeSidebarTab,
    setActiveSidebarTab,
    setActiveRightPanelTab,
    activeRightPanelTab,
    setRightPanelOpen,
  } = useLayoutStore();
  const { searchTerm, setSearchTerm, handleNewThread, handleMenu } = useThreadList();
  const { handleSessionSelect } = useCCSessionManager();
  const { hasUpdate, startUpdate } = useUpdater({ enabled: true });
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const sortedProjects = useMemo(() => projects, [projects]);

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

  return (
    <div className="flex h-full w-[var(--sidebar-width)] min-w-[var(--sidebar-width)] max-w-[var(--sidebar-width)] flex-col border-r border-sidebar-border">
      <div className="gap-1 p-2 flex flex-col">
        <div className="flex items-center gap-2 pl-20" data-tauri-drag-region>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            <PanelLeft />
          </Button>
          <UpdateButton
            isDev={import.meta.env.DEV}
            hasUpdate={hasUpdate}
            onUpdate={startUpdate}
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search threads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="flex flex-col gap-1 px-1">
          <Button
            variant="ghost"
            onClick={handleNewThread}
            size="sm"
            className="justify-start gap-2 h-8"
          >
            <SquarePen /> New Thread
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 h-8"
            onClick={() => setView('automate')}
          >
            <Terminal className="h-4 w-4" />
            Automate
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 h-8"
            onClick={() => setView('marketplace')}
          >
            <Package /> Skills | MCP | Prompt
          </Button>
        </div>
        <span className="flex justify-between">
          <span className="flex">
            <Button
              variant="ghost"
              className={`${activeSidebarTab === 'codex' ? 'bg-accent' : ''}`}
              onClick={() => {
                setSelectedAgent('codex');
                setActiveSidebarTab('codex');
              }}
            >
              codex
            </Button>
            <Button
              variant="ghost"
              className={`${activeSidebarTab === 'cc' ? 'bg-accent' : ''}`}
              onClick={() => {
                setSelectedAgent('cc');
                setActiveSidebarTab('cc');
              }}
            >
              cc
            </Button>
            <Button
              variant="ghost"
              className={`${activeSidebarTab === 'explorer' ? 'bg-accent' : ''}`}
              onClick={() => {
                setActiveSidebarTab('explorer');
              }}
            >
              Files
            </Button>
          </span>
          <span className="flex">
            <Button variant="ghost" size="icon" title="Add new project" onClick={handleAddProject}>
              <FolderPlus />
            </Button>
            <Button variant="ghost" size="icon" title="Filter threads" onClick={handleMenu}>
              <ListFilter />
            </Button>
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
                  className="rounded-lg border border-sidebar-border bg-sidebar/30"
                >
                  <div
                    className={`flex items-center gap-1 rounded-t-lg px-2 py-1.5 text-xs transition-colors ${
                      cwd === project
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
                      onClick={handleNewThread}
                      className="shrink-0"
                    >
                      <SquarePen />
                    </Button>
                  </div>
                  <CollapsibleContent className="border-t border-sidebar-border px-1 pb-1 pt-1">
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
            <div className="w-full min-w-0 max-w-full overflow-x-hidden">
              <ClaudeCodeSessionList onSelectSession={handleSessionSelect} />
            </div>
          )}
          {activeSidebarTab === 'explorer' && (
            <FileTree
              folder={cwd}
              onFileSelect={() => {
                setRightPanelOpen(true);
                if (activeRightPanelTab !== 'files') {
                  setActiveRightPanelTab('files');
                }
              }}
            />
          )}
        </ScrollArea>
      </div>

      <div className="min-h-0 min-w-0 max-w-full overflow-x-hidden flex flex-col gap-2">
        <div className="shrink-0">
          <UserInfo />
        </div>
      </div>
    </div>
  );
}
