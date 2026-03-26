import { useState } from 'react';
import { Globe, CheckCircle, Plus } from 'lucide-react';
import { MCP } from '@lobehub/icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CodexMcpView } from '@/components/features/mcp/CodexMcpView';
import CCMcpView from '@/components/cc/mcp/CCMcpView';
import DxtView from '@/components/features/dxt/DxtView';
import { McpAddSheet } from '@/components/features/mcp/McpAddSheet';
import { useWorkspaceStore, useLayoutStore } from '@/stores';
import { AgentSwitcher } from '@/components/common/AgentSwitcher';
import { useTrafficLightConfig } from '@/hooks';
import { McpLinkerButton } from '@/components/features/mcp';

export default function McpView() {
  const { selectedAgent } = useWorkspaceStore();
  const { isSidebarOpen } = useLayoutStore();
  const { needsTrafficLightOffset } = useTrafficLightConfig(isSidebarOpen);
  const [activeTab, setActiveTab] = useState('browser');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleServerAdded = () => {
    setRefreshKey((k) => k + 1);
    setActiveTab('installed');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={`flex items-center gap-2 h-11 shrink-0 py-2 pr-3 ${needsTrafficLightOffset ? 'pl-32' : 'pl-4'}`}
        data-tauri-drag-region
      >
        <MCP />
        <span className="font-semibold">MCP</span>
        <div className="flex-1" />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <AgentSwitcher />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 pt-3 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="shrink-0 border-b flex justify-between">
            <nav className="flex gap-0.5">
              <TabsList className="bg-transparent p-0 h-auto gap-0">
                <TabsTrigger
                  value="browser"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Browser
                </TabsTrigger>
                <TabsTrigger
                  value="installed"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Installed
                </TabsTrigger>
              </TabsList>
            </nav>
            <McpLinkerButton />
          </div>

          <div className="flex-1 min-h-0">
            <TabsContent value="browser" className="h-full m-0 overflow-hidden">
              <DxtView />
            </TabsContent>
            <TabsContent value="installed" className="h-full m-0 overflow-hidden">
              {selectedAgent === 'codex' ? (
                <CodexMcpView refreshKey={refreshKey} />
              ) : (
                <CCMcpView refreshKey={refreshKey} />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <McpAddSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        selectedAgent={selectedAgent}
        onServerAdded={handleServerAdded}
      />
    </div>
  );
}
