import { BotMessageSquare, ListFilter, Package, PanelLeft, SquarePen, Timer } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useAgentCenterStore, useLayoutStore } from '@/stores';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserInfo } from './UserInfo';
import { useThreadList } from '@/hooks/codex';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSettingsStore } from '@/stores/settings';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useUpdater } from '@/hooks/useUpdater';
import { UpdateButton } from '../features/UpdateButton';
import { isTauri } from '@/hooks/runtime';
import { useIsMobile } from '@/hooks/use-mobile';
import { SideBarCodexTab } from './SideBarCodexTab';
import { SideBarClaudeTab } from './SideBarClaudeTab';
import { SideBarAddProjectButton } from './SideBarAddProjectButton';

// Stable reference — no need to recreate on every render
const focusCCInput = () => window.dispatchEvent(new Event('cc-input-focus-request'));

// Shared class for the scroll area's deeply nested overrides
const SCROLL_AREA_CLS = [
  'flex-1 min-h-0 min-w-0 max-w-full overflow-x-hidden',
  '[&>[data-radix-scroll-area-viewport]]:overflow-x-hidden',
  '[&>[data-radix-scroll-area-viewport]>div]:!block',
  '[&>[data-radix-scroll-area-viewport]>div]:!w-full',
  '[&>[data-radix-scroll-area-viewport]>div]:min-w-0',
].join(' ');

// Shared class for nav buttons (Automations / Marketplace)
const navBtnBase = 'h-8 justify-start gap-1.5 rounded-md border pl-0 pr-2 has-[>svg]:pl-0';
const navBtnActive = 'border-border bg-accent/70 text-foreground';
const navBtnInactive = 'border-transparent hover:border-border/60';
const navBtnCls = (active: boolean) => `${navBtnBase} ${active ? navBtnActive : navBtnInactive}`;

// Tab definitions for Codex / Claude switcher
const SIDEBAR_TABS = [
  { key: 'codex', label: 'Codex', agent: 'codex' },
  { key: 'cc', label: 'Claude', agent: 'cc' },
] as const;

export function SideBar() {
  const { cwd, setCwd, selectedAgent, setSelectedAgent } = useWorkspaceStore();
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const { isSidebarOpen, setSidebarOpen, setView, view, activeSidebarTab, setActiveSidebarTab } =
    useLayoutStore();
  const { searchTerm, setSearchTerm, sortKey, setSortKey, handleNewThread } = useThreadList({
    enabled: activeSidebarTab === 'codex',
  });
  const { handleNewSession } = useCCSessionManager();
  const { showSidebarMarketplace } = useSettingsStore();
  const { hasUpdate, startUpdate } = useUpdater({ enabled: true });
  const isMobile = useIsMobile();

  const currentThreadSortLabel = sortKey === 'created_at' ? 'Created' : 'Updated';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateNew = useCallback(
    async (project?: string) => {
      if (project && project !== cwd) setCwd(project);

      if (selectedAgent === 'cc') {
        setActiveSidebarTab('cc');
        setCurrentAgentCardId(null);
        setView('agent');
        await handleNewSession();
        focusCCInput();
        return;
      }
      await handleNewThread();
    },
    [cwd, handleNewSession, handleNewThread, selectedAgent, setActiveSidebarTab, setCwd, setView],
  );

  // Only the async side-effect coordinator stays here — expanded state & agent
  // instructions handler have been moved into each Tab component.
  const handleCreateNewThreadForProject = useCallback(
    (project: string) => void handleCreateNew(project),
    [handleCreateNew],
  );

  const handleStartNewCcSessionForProject = useCallback(
    async (project: string) => {
      setSelectedAgent('cc');
      setActiveSidebarTab('cc');
      setView('agent');
      setCwd(project);
      await handleNewSession();
      focusCCInput();
    },
    [handleNewSession, setActiveSidebarTab, setCwd, setSelectedAgent, setView],
  );

  // ── Keyboard shortcut: Cmd/Ctrl+N → new thread / session ─────────────────

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        Boolean(target.closest('[contenteditable="true"]'))
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isNew = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n';
      if (!isNew || e.shiftKey || e.altKey || e.repeat) return;
      if (view !== 'codex' && view !== 'cc') return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      void handleCreateNew();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCreateNew, view]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-zinc-100/95 dark:bg-zinc-900/95">

      {/* Top controls */}
      <div className="flex flex-col gap-1 p-2">

        {/* Header row: toggle + update */}
        <div
          className={`flex items-center gap-2 ${isTauri() && !isMobile ? 'pl-20' : 'pl-2'}`}
          data-tauri-drag-region
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <UpdateButton hasUpdate={hasUpdate} onUpdate={startUpdate} />
        </div>

        {/* Search */}
        <Input
          placeholder="Search threads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8"
        />

        {/* Nav actions */}
        <div className="flex flex-col">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-1.5 pl-0 pr-2 has-[>svg]:pl-0"
            onClick={() => void handleCreateNew()}
          >
            <SquarePen className="h-4 w-4" />
            {selectedAgent === 'cc' ? 'New Session' : 'New Thread'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={navBtnCls(view === 'agent')}
            onClick={() => setView('agent')}
          >
            <BotMessageSquare className="h-4 w-4" />
            Agent Center
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={navBtnCls(view === 'automations')}
            onClick={() => setView('automations')}
          >
            <Timer className="h-4 w-4" />
            Automations
          </Button>

          {showSidebarMarketplace && (
            <Button
              variant="ghost"
              size="sm"
              className={navBtnCls(view === 'marketplace')}
              onClick={() => setView('marketplace')}
            >
              <Package className="h-4 w-4" />
              Skills | MCP
            </Button>
          )}
        </div>

        {/* Tab switcher row */}
        <span className="flex justify-between">
          <span className="flex">
            {SIDEBAR_TABS.map(({ key, label, agent }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                className={`h-8 px-2 ${activeSidebarTab === key ? 'bg-accent' : ''}`}
                onClick={() => {
                  setSelectedAgent(agent);
                  setActiveSidebarTab(key);
                }}
              >
                {label}
              </Button>
            ))}
          </span>

          <span className="flex">
            <SideBarAddProjectButton />

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
                  onValueChange={(v) => setSortKey(v as 'created_at' | 'updated_at')}
                >
                  <DropdownMenuRadioItem value="created_at">Sort by Created</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="updated_at">Sort by Updated</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </span>
      </div>

      {/* Thread list */}
      <div className="flex flex-1 flex-col gap-2 min-h-0 min-w-0 max-w-full overflow-x-hidden">
        <ScrollArea className={SCROLL_AREA_CLS}>
          {activeSidebarTab === 'codex' && (
            <SideBarCodexTab onCreateNewThread={handleCreateNewThreadForProject} />
          )}
          {activeSidebarTab === 'cc' && (
            <SideBarClaudeTab onStartNewSession={handleStartNewCcSessionForProject} />
          )}
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 min-h-0 min-w-0 max-w-full overflow-x-hidden">
        <UserInfo />
      </div>
    </div>
  );
}
