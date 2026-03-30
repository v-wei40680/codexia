import { useCallback, useEffect, useState } from 'react';
import { MCP } from '@lobehub/icons';
import { MoreHorizontal, Package2, Plus, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DxtView from '@/components/features/dxt/DxtView';
import SkillsViewContent from '@/components/features/skills/SkillsView';
import { CodexMcpView } from '@/components/features/mcp/CodexMcpView';
import CCMcpView from '@/components/cc/mcp/CCMcpView';
import { InstalledTab } from '@/components/features/skills/InstalledTab';
import { McpAddSheet } from '@/components/features/mcp/McpAddSheet';
import { useWorkspaceStore, useLayoutStore } from '@/stores';
import { useTrafficLightConfig } from '@/hooks';
import {
  type SkillGroupsConfig,
  type SkillScope,
  readSkillGroups,
  writeSkillGroups,
} from '@/services';
import { AgentSwitcher } from '@/components/common/AgentSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';

type PluginTab = 'MCP' | 'Skills' | 'manage';
type ManageSubTab = 'Skills' | 'MCPs';

export default function PluginsView() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<PluginTab>('manage');
  const [manageSubTab, setManageSubTab] = useState<ManageSubTab>('MCPs');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [manageRefreshKey, setManageRefreshKey] = useState(0);
  const [groupsConfig, setGroupsConfig] = useState<SkillGroupsConfig>({ groups: [] });

  const { selectedAgent } = useWorkspaceStore();
  const { isSidebarOpen } = useLayoutStore();
  const { needsTrafficLightOffset } = useTrafficLightConfig(isSidebarOpen);
  const scope: SkillScope = 'user';

  useEffect(() => {
    readSkillGroups()
      .then(setGroupsConfig)
      .catch(() => { });
  }, []);

  const saveGroups = useCallback(
    async (config: SkillGroupsConfig) => {
      setGroupsConfig(config);
      await writeSkillGroups(config);
    },
    [],
  );

  return (
    <div className="flex flex-col h-screen">
      {/* Header row */}
      <div className={`flex items-center gap-1.5 p-2 ${needsTrafficLightOffset && 'pl-32'}`} data-tauri-drag-region>
        {/* Pill tab switcher */}
        <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
          {(['MCP', 'Skills'] as const).map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              onClick={() => setTab(t)}
              className={`h-7 ${tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
            >
              {t === 'MCP' ? <MCP className="h-3.5 w-3.5" /> : <Package2 className="h-4 w-4" />} {isMobile ? '' : t}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Manage */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 gap-1.5 text-sm ${tab === 'manage' ? 'bg-background text-foreground shadow-sm' : ''}`}
          onClick={() => setTab(tab === 'manage' ? 'MCP' : 'manage')}
        >
          <Settings className="h-3.5 w-3.5" />
          {isMobile ? '' : 'Manage'}
        </Button>
        <AgentSwitcher />
        {/* Create — MCP functional, Skills placeholder */}
        {tab !== 'manage' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={tab === 'MCP' ? 'Add MCP server' : 'Coming soon'}
            disabled={tab === 'Skills'}
            onClick={() => { if (tab === 'MCP') setAddOpen(true); }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* More — Refresh */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRefreshTrigger((k) => k + 1)}>
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              {tab === 'MCP' ? 'Reload extensions' : tab === 'Skills' ? 'Refresh skills' : 'Refresh'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'MCP' && <DxtView refreshTrigger={refreshTrigger} />}
        {tab === 'Skills' && <SkillsViewContent />}
        {tab === 'manage' && (
          <div className="flex flex-col h-full">
            {/* Manage sub-tab bar */}
            <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
              <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
                {(['MCPs', 'Skills'] as const).map((st) => (
                  <Button
                    key={st}
                    variant="ghost"
                    size="sm"
                    onClick={() => setManageSubTab(st as ManageSubTab)}
                    className={`h-7 ${manageSubTab === st ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    {st === 'MCPs' ? <MCP className="h-3.5 w-3.5" /> : <Package2 className="h-4 w-4" />}{' '}
                    {st}
                  </Button>
                ))}
              </div>
            </div>

            {/* Manage sub-tab content */}
            <div className="flex-1 min-h-0 overflow-y-auto py-3">
              {manageSubTab === 'MCPs' ? (
                selectedAgent === 'codex' ? (
                  <CodexMcpView refreshKey={manageRefreshKey} />
                ) : (
                  <CCMcpView refreshKey={manageRefreshKey} />
                )
              ) : (
                <div className="px-4">
                  <InstalledTab
                    searchQuery=""
                    scope={scope}
                    refreshKey={manageRefreshKey}
                    groupsConfig={groupsConfig}
                    onGroupsChange={saveGroups}
                    selectedGroupId={null}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MCP Add Sheet */}
      <McpAddSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        selectedAgent={selectedAgent}
        onServerAdded={() => {
          setManageRefreshKey((k) => k + 1);
          setAddOpen(false);
          setTab('manage');
          setManageSubTab('MCPs');
        }}
      />
    </div>
  );
}
