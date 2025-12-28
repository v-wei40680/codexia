import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsageView from "@/views/UsageView";
import { UsageDashboard } from "../cc";

export function UsagePanel() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="codex" className="w-full flex flex-col h-full">
        <TabsList className="w-full">
          <TabsTrigger value="codex">codex</TabsTrigger>
          <TabsTrigger value="cc">cc</TabsTrigger>
        </TabsList>

        <TabsContent value="codex" className="flex-1 overflow-hidden">
          <UsageView />
        </TabsContent>

        <TabsContent value="cc" className="flex-1 overflow-hidden">
          <UsageDashboard onBack={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
