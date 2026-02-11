import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CodexMcpView } from '@/components/features/mcp/CodexMcpView';
import CCMcpView from '@/components/cc/mcp/CCMcpView';
import DxtView from '@/components/features/dxt/DxtView';

export function McpView() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="marketplace" className="w-full flex flex-col h-full">
        <TabsList className="w-full">
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="codex">Codex</TabsTrigger>
          <TabsTrigger value="cc">Claude Code</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="flex-1 overflow-hidden">
          <DxtView />
        </TabsContent>

        <TabsContent value="codex" className="flex-1 overflow-hidden">
          <CodexMcpView />
        </TabsContent>

        <TabsContent value="cc" className="flex-1 overflow-hidden">
          <CCMcpView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
