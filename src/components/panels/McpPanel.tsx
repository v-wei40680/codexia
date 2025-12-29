import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import McpView from "@/views/McpView";

export function McpPanel() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="codex" className="w-full flex flex-col h-full">
        <TabsList className="w-full">
          <TabsTrigger value="codex">codex</TabsTrigger>
          <TabsTrigger value="cc">cc</TabsTrigger>
        </TabsList>

        <TabsContent value="codex" className="flex-1 overflow-hidden">
          <McpView />
        </TabsContent>

        <TabsContent value="cc" className="flex-1 overflow-hidden">
          wait
        </TabsContent>
      </Tabs>
    </div>
  );
}
