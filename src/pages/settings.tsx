import SettingsSidebar from "@/components/settings/SettingsSidebar";
import ExcludeFolders from "@/components/settings/ExcludeFolders";
import { RateLimitSettings, CodexAuth } from "@/components/settings";
import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { PromptOptimizerSettings } from "@/components/settings/PromptOptimizerSettings";
import { RemoteAccessSettings } from "@/components/settings/RemoteAccessSettings";
import { GitWorktreeSettings } from "@/components/settings/GitWorktreeSettings";

export default function SettingsPage() {
  const { activeSection, setActiveSection } = useSettingsStore();

  return (
    <div className="flex h-screen">
      <SettingsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex-1 px-6 overflow-y-auto space-y-6">
        {activeSection === "login" && <CodexAuth />}
        {activeSection === "rateLimit" && <RateLimitSettings />}
        {activeSection === "promptOptimizer" && <PromptOptimizerSettings />}
        {activeSection === "remoteAccess" && <RemoteAccessSettings />}
        {activeSection === "exclude" && <ExcludeFolders />}
        {activeSection === "gitWorktree" && <GitWorktreeSettings />}
      </div>
    </div>
  );
}
