import SettingsSidebar from "@/components/settings/SettingsSidebar";
import ExcludeFolders from "@/components/settings/ExcludeFolders";
import { useSettingsStore } from "@/stores/SettingsStore";
import { PromptOptimizerSettings } from "@/components/settings/PromptOptimizerSettings";
import { RemoteAccessSettings } from "@/components/settings/RemoteAccessSettings";

export default function SettingsPage() {
  const { activeSection, setActiveSection } = useSettingsStore();

  return (
    <div className="flex h-screen">
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 px-6 overflow-y-auto">
        {activeSection === "promptOptimizer" && <PromptOptimizerSettings />}
        {activeSection === "remoteAccess" && <RemoteAccessSettings />}
        {activeSection === "exclude" && <ExcludeFolders />}
      </div>
    </div>
  );
}
