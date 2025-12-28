import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "@/components/cc/Settings";
import SettingsView from "@/views/SettingsView";

export function SettingsPanel() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="codex" className="w-full flex flex-col h-full">
        <TabsList className="w-full">
          <TabsTrigger value="codex">codex</TabsTrigger>
          <TabsTrigger value="cc">cc</TabsTrigger>
        </TabsList>

        <TabsContent value="codex" className="flex-1 overflow-hidden">
          <SettingsView />
        </TabsContent>

        <TabsContent value="cc" className="flex-1 overflow-hidden">
          <Settings onBack={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
