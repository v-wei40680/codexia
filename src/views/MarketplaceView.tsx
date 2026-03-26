import { ShoppingBag, Globe, CheckCircle } from 'lucide-react';
import { SkillsView } from '@/components/features/skills';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CodexMcpView } from '@/components/features/mcp/CodexMcpView';
import CCMcpView from '@/components/cc/mcp/CCMcpView';
import DxtView from '@/components/features/dxt/DxtView';
import { useWorkspaceStore } from '@/stores';
import { useLayoutStore } from '@/stores';
import { AgentSwitcher } from '@/components/common/AgentSwitcher';
import { useTrafficLightConfig } from '@/hooks';
import { ProjectSelector } from '@/components/project-selector';

export function MarketplaceView() {
  const { selectedAgent } = useWorkspaceStore();
  const { isSidebarOpen } = useLayoutStore();
  const { needsTrafficLightOffset } = useTrafficLightConfig(isSidebarOpen);

  return (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center gap-2 h-11 py-2 ${needsTrafficLightOffset ? 'pl-32' : 'pl-4'}`}
        data-tauri-drag-region
      >
        <ShoppingBag className="shrink-0" />
        <span className="font-semibold">Marketplace</span>
        <ProjectSelector />
      </div>
      <Tabs defaultValue="skills" className="flex flex-col h-full">
        <div className="flex items-center gap-2 justify-between">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="skills">
              Skills
            </TabsTrigger>
            <TabsTrigger value="mcp">
              MCP
            </TabsTrigger>
          </TabsList>

          <AgentSwitcher />
        </div>

        <TabsContent value="skills" className="h-[calc(100%-3rem)] min-h-0 overflow-hidden">
          <SkillsView />
        </TabsContent>
        <TabsContent value="mcp" className="h-[calc(100%-3rem)] min-h-0 overflow-hidden">
          <Tabs defaultValue="marketplace" className="flex h-full w-full flex-col">
            <div className="mb-4">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="marketplace" className="h-8 gap-2 data-[state=active]:bg-background">
                  <Globe className="h-3.5 w-3.5" />
                  <span>Browser</span>
                </TabsTrigger>
                <TabsTrigger value="installed" className="h-8 gap-2 data-[state=active]:bg-background">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Installed</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="marketplace" className="h-full m-0 overflow-hidden">
                <DxtView />
              </TabsContent>

              <TabsContent value="installed" className="h-full m-0 overflow-hidden">
                {selectedAgent === 'codex' ? <CodexMcpView /> : <CCMcpView />}
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
