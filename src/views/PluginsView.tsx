import { useCallback, useEffect, useState } from 'react';
import { MCP } from '@lobehub/icons';
import { ArrowLeft, MoreHorizontal, Package2, Plus, RotateCcw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DxtView from '@/components/features/dxt/DxtView';
import SkillsViewContent from '@/components/features/skills/SkillsView';
import { Clone } from '@/components/features/skills/Clone';
import { CodexMcpView } from '@/components/features/mcp/CodexMcpView';
import CCMcpView from '@/components/cc/mcp/CCMcpView';
import { InstalledTab } from '@/components/features/skills/InstalledTab';
import { McpServerForm } from '@/components/features/mcp/McpServerForm';
import { useWorkspaceStore, useLayoutStore } from '@/stores';
import { useTrafficLightConfig } from '@/hooks';
import {
  type SkillGroupsConfig,
  type SkillScope,
  readSkillGroups,
  writeSkillGroups,
  unifiedAddMcpServer,
  ccMcpAdd,
} from '@/services';
import { AgentSwitcher } from '@/components/common/AgentSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';
import type { McpServerConfig } from '@/types';
import { toast } from 'sonner';

type ActiveTab = 'MCP' | 'Skills' | 'manage' | 'add';
type ManageTab = 'Skills' | 'MCPs';
type AddTab = 'MCP' | 'Skill';

export default function PluginsView() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<ActiveTab>('manage');
  const [manageTab, setManageTab] = useState<ManageTab>('MCPs');
  const [addTab, setAddTab] = useState<AddTab>('MCP');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [manageRefreshKey, setManageRefreshKey] = useState(0);
  const [groupsConfig, setGroupsConfig] = useState<SkillGroupsConfig>({ groups: [] });

  // MCP add form state
  const [serverName, setServerName] = useState('');
  const [protocol, setProtocol] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [commandConfig, setCommandConfig] = useState({ command: '', args: '', env: '' });
  const [httpConfig, setHttpConfig] = useState({ url: '' });

  const { selectedAgent, cwd } = useWorkspaceStore();
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

  const resetAddForm = () => {
    setServerName('');
    setProtocol('stdio');
    setCommandConfig({ command: '', args: '', env: '' });
    setHttpConfig({ url: '' });
  };

  const handleAddMcp = async () => {
    if (!serverName.trim()) return;
    try {
      if (selectedAgent === 'codex') {
        let config: McpServerConfig;
        if (protocol === 'stdio') {
          config = {
            type: 'stdio',
            command: commandConfig.command,
            args: commandConfig.args.split(' ').filter((a) => a.trim()),
          };
          if (commandConfig.env.trim()) {
            try { config.env = JSON.parse(commandConfig.env); }
            catch { toast.error('Invalid JSON for environment variables'); return; }
          }
        } else {
          config = { type: protocol, url: httpConfig.url };
        }
        await unifiedAddMcpServer({ clientName: 'codex', serverName, serverConfig: config });
      } else {
        const request: any = { name: serverName, type: protocol, scope: 'local', enabled: true };
        if (protocol === 'stdio') {
          if (!commandConfig.command.trim()) { toast.error('Command is required'); return; }
          request.command = commandConfig.command;
          request.args = commandConfig.args
            ? commandConfig.args.split(' ').filter((a) => a.trim())
            : undefined;
          if (commandConfig.env.trim()) {
            try { request.env = JSON.parse(commandConfig.env); }
            catch { toast.error('Invalid JSON for environment variables'); return; }
          }
        } else {
          if (!httpConfig.url.trim()) { toast.error('URL is required'); return; }
          request.url = httpConfig.url;
        }
        await ccMcpAdd(request, cwd || '');
      }
      toast.success(`Server "${serverName}" added`);
      resetAddForm();
      setManageRefreshKey((k) => k + 1);
      setTab('manage');
      setManageTab('MCPs');
    } catch (error) {
      toast.error('Failed to add MCP server: ' + error);
    }
  };

  const isAddDisabled =
    !serverName.trim() ||
    (protocol === 'stdio' ? !commandConfig.command.trim() : !httpConfig.url.trim());

  return (
    <div className="flex flex-col h-screen">
      {/* Header row */}
      <div className={`flex items-center gap-1.5 p-2 ${needsTrafficLightOffset && 'pl-32'}`} data-tauri-drag-region>

        {tab === 'add' ? (
          // Add panel header
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { resetAddForm(); setTab('manage'); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
              {(['MCP', 'Skill'] as const).map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddTab(t)}
                  className={`h-7 ${addTab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {t === 'MCP' ? <MCP className="h-3.5 w-3.5" /> : <Package2 className="h-4 w-4" />}
                  {isMobile ? '' : ` ${t}`}
                </Button>
              ))}
            </div>
            <div className="flex-1" />
            <AgentSwitcher />
          </>
        ) : (
          // Normal header
          <>
            {/* Browse pill tabs */}
            <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
              {(['MCP', 'Skills'] as const).map((t) => (
                <Button
                  key={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab(t)}
                  className={`h-7 ${tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {t === 'MCP' ? <MCP className="h-3.5 w-3.5" /> : <Package2 className="h-4 w-4" />}
                  {isMobile ? '' : ` ${t}`}
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

            {/* Add */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Add MCP server or install skill"
              onClick={() => {
              resetAddForm();
              setAddTab(tab === 'Skills' ? 'Skill' : 'MCP');
              setTab('add');
            }}
            >
              <Plus className="h-4 w-4" />
            </Button>

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
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'MCP' && <DxtView refreshTrigger={refreshTrigger} />}
        {tab === 'Skills' && <SkillsViewContent />}

        {tab === 'manage' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
              <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
                {(['MCPs', 'Skills'] as const).map((st) => (
                  <Button
                    key={st}
                    variant="ghost"
                    size="sm"
                    onClick={() => setManageTab(st as ManageTab)}
                    className={`h-7 ${manageTab === st ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
                  >
                    {st === 'MCPs' ? <MCP className="h-3.5 w-3.5" /> : <Package2 className="h-4 w-4" />}{' '}
                    {st}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto py-3">
              {manageTab === 'MCPs' ? (
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

        {tab === 'add' && (
          <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
            {addTab === 'MCP' ? (
              <>
                <McpServerForm
                  serverName={serverName}
                  onServerNameChange={setServerName}
                  protocol={protocol}
                  onProtocolChange={setProtocol}
                  commandConfig={commandConfig}
                  onCommandConfigChange={setCommandConfig}
                  httpConfig={httpConfig}
                  onHttpConfigChange={setHttpConfig}
                />
                <Button onClick={handleAddMcp} disabled={isAddDisabled} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Server
                </Button>
              </>
            ) : (
              <Clone />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
