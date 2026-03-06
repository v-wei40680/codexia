import { ShoppingBag, Bot, Globe, CheckCircle } from 'lucide-react';
import { SkillsView } from '@/components/features/skills';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CodexMcpView } from '@/components/features/mcp/CodexMcpView';
import CCMcpView from '@/components/cc/mcp/CCMcpView';
import DxtView from '@/components/features/dxt/DxtView';
import { NoteView } from '@/components/features/notes';
import { useWorkspaceStore } from '@/stores';
import { cn } from '@/lib/utils';

export function MarketplaceView() {
  const { selectedAgent, setSelectedAgent } = useWorkspaceStore();

  return (
    <Tabs defaultValue="skills" className="flex h-full min-h-0 flex-col gap-4 text-foreground">
      <div className="flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Marketplace</h1>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="skills">
              Skills
            </TabsTrigger>
            <TabsTrigger value="mcp">
              MCP
            </TabsTrigger>
            <TabsTrigger value="prompt">
              Prompts
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 gap-2 px-3 transition-all',
              selectedAgent === 'codex'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50'
            )}
            onClick={() => setSelectedAgent('codex')}
          >
            <Bot className="h-4 w-4" />
            <span className="font-medium uppercase tracking-wider text-[10px]">Codex</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 gap-2 px-3 transition-all',
              selectedAgent === 'cc'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/50'
            )}
            onClick={() => setSelectedAgent('cc')}
          >
            <Bot className="h-4 w-4 opacity-70" />
            <span className="font-medium uppercase tracking-wider text-[10px]">Claude</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">

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
        <TabsContent value="prompt" className="h-[calc(100%-3rem)] min-h-0 overflow-hidden">
          <NoteView />
        </TabsContent>
      </div>
    </Tabs>
  );
}
