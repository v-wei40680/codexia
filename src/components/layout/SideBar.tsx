import { ListFilter, Package, PanelLeft, Timer, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useLayoutStore } from '@/stores';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
} from '@/components/ui/sidebar';
import { UserInfo } from './UserInfo';
import { useThreadList } from '@/hooks/codex';
import { AgentType, useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useSettingsStore } from '@/stores/settings';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { useUpdater } from '@/hooks/useUpdater';
import { UpdateButton } from '../features/UpdateButton';
import { useTrafficLightConfig } from '@/hooks';
import { SideBarCodexTab } from './SideBarCodexTab';
import { SideBarClaudeTab } from './SideBarClaudeTab';
import { AgentIcon } from '@/components/common/AgentIcon';
import { SessionManagerDialog } from './SessionManagerDialog';
import { TunnelIndicator } from '@/components/features/TunnelIndicator';
import { FeedbackDialog } from '../dialogs/FeedbackDialog';

const focusCCInput = () => window.dispatchEvent(new Event('cc-input-focus-request'));

// Shared class for nav buttons (Automations / Marketplace)
const navBtnBase = 'h-8 justify-start gap-1.5 rounded-md border pl-0 pr-2 has-[>svg]:pl-0';
const navBtnActive = 'border-border bg-accent/70 text-foreground';
const navBtnInactive = 'border-transparent hover:border-border/60';
const navBtnCls = (active: boolean) => `${navBtnBase} ${active ? navBtnActive : navBtnInactive}`;

export function SideBar() {
  const { cwd, setCwd, setSelectedAgent } = useWorkspaceStore();
  const { isSidebarOpen, setSidebarOpen, setView, view, activeSidebarTab, setActiveSidebarTab } =
    useLayoutStore();
  const { isMacos } = useTrafficLightConfig(isSidebarOpen);
  const { searchTerm, setSearchTerm, sortKey, setSortKey, handleNewThread } = useThreadList({
    enabled: isSidebarOpen && activeSidebarTab === 'codex',
  });
  const { handleNewSession } = useCCSessionManager();
  const { showSidebarMarketplace } = useSettingsStore();
  const { hasUpdate, startUpdate } = useUpdater({ enabled: true });
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);

  const currentThreadSortLabel = sortKey === 'created_at' ? 'Created' : 'Updated';

  const handleCreateNewThreadForProject = useCallback(
    (project: string) => {
      if (project !== cwd) setCwd(project);
      void handleNewThread();
    },
    [cwd, handleNewThread, setCwd],
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

  return (
    <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-zinc-100/95 dark:bg-zinc-900/95">
      <SidebarHeader className="gap-1 p-2">

        {/* Header row: toggle + update */}
        <div
          className={`flex items-center gap-2 ${isMacos ? 'pl-20' : 'pl-2'}`}
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
        <SidebarInput
          placeholder="Search threads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Nav actions */}
        <div className="flex flex-col">
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
          <span className="flex gap-2">
            {(['cc', 'codex'] as AgentType[]).map((agent) => (
              <Button
                key={agent}
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${activeSidebarTab === agent ? 'bg-accent' : ''}`}
                onClick={() => {
                  setSelectedAgent(agent);
                  setActiveSidebarTab(agent);
                }}
              >
                <AgentIcon agent={agent} />
              </Button>
            ))}
          </span>

          <span className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Manage sessions & threads"
              onClick={() => setSessionManagerOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
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
                  onValueChange={(v) => setSortKey(v as 'created_at' | 'updated_at')}
                >
                  <DropdownMenuRadioItem value="created_at">Sort by Created</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="updated_at">Sort by Updated</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        </span>
      </SidebarHeader>

      {/* Thread list */}
      <SidebarContent className="min-w-0 max-w-full overflow-x-hidden gap-0 px-0">
        {activeSidebarTab === 'codex' && (
          <SideBarCodexTab onCreateNewThread={handleCreateNewThreadForProject} />
        )}
        {activeSidebarTab === 'cc' && (
          <SideBarClaudeTab onStartNewSession={handleStartNewCcSessionForProject} />
        )}
      </SidebarContent>

      <SidebarFooter className="flex-row items-center p-0 min-w-0 max-w-full overflow-x-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <UserInfo />
        </div>
        <div className="flex-shrink-0 pr-2 flex items-center gap-2">
          <TunnelIndicator />
          <FeedbackDialog />
        </div>
      </SidebarFooter>

      <SessionManagerDialog
        open={sessionManagerOpen}
        onOpenChange={setSessionManagerOpen}
        defaultTab={activeSidebarTab === 'cc' ? 'cc' : 'codex'}
      />
    </div>
  );
}
