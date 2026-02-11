import { SkillsView } from '@/components/features/skills';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { McpView } from './McpView';
import { NoteView } from '@/components/features/notes';
import { useWorkspaceStore } from '@/stores';

export function MarketplaceView() {
  const { selectedAgent, setSelectedAgent } = useWorkspaceStore();
  return (
    <Tabs defaultValue="skills" className="h-full min-h-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
        </TabsList>
        <span className="flex">
          <Button
            variant="ghost"
            className={`${selectedAgent === 'codex' ? 'bg-accent' : ''}`}
            onClick={() => {
              setSelectedAgent('codex');
            }}
          >
            codex
          </Button>
          <Button
            variant="ghost"
            className={`${selectedAgent === 'cc' ? 'bg-accent' : ''}`}
            onClick={() => {
              setSelectedAgent('cc');
            }}
          >
            Claude Code
          </Button>
        </span>
      </div>
      <TabsContent value="skills" className="min-h-0 overflow-hidden">
        <SkillsView />
      </TabsContent>
      <TabsContent value="mcp" className="min-h-0 overflow-hidden">
        <McpView />
      </TabsContent>
      <TabsContent value="prompt" className="min-h-0 overflow-hidden">
        <NoteView />
      </TabsContent>
    </Tabs>
  );
}
