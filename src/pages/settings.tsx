import SettingsSidebar from "@/components/settings/SettingsSidebar";
import ExcludeFolders from "@/components/settings/ExcludeFolders";
import { RateLimitSettings, CodexAuth } from "@/components/settings";
import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { PromptOptimizerSettings } from "@/components/settings/PromptOptimizerSettings";
import { RemoteAccessSettings } from "@/components/settings/RemoteAccessSettings";
import { GitWorktreeSettings } from "@/components/settings/GitWorktreeSettings";
import { AnalyticsSettings } from "@/components/settings/AnalyticsSettings";
import { Button } from "@/components/ui/button";
import { AccentColorSelector } from "@/components/common/AccentColorSelector";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { useThemeContext } from "@/contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { useTranslation } from "react-i18next";

function ThemeSettings() {
  const { theme, toggleTheme } = useThemeContext();
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Theme & Language</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Accent Color</h3>
          <AccentColorSelector />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Language</h3>
          <LanguageSelector />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Theme</h3>
          <Button
            variant="outline"
            onClick={toggleTheme}
            className="w-full justify-start"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 mr-2" />
            ) : (
              <Moon className="w-4 h-4 mr-2" />
            )}
            {t("header.toggleTheme")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { activeSection, setActiveSection } = useSettingsStore();

  return (
    <div className="flex h-full">
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
        {activeSection === "appearance" && <ThemeSettings />}
        {activeSection === "analytics" && <AnalyticsSettings />}
      </div>
    </div>
  );
}
