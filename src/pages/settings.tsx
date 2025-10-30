import { useState } from "react";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import ProviderList from "@/components/settings/ProviderList";
import ProviderModels from "@/components/settings/ProviderModels";
import ExcludeFolders from "@/components/settings/ExcludeFolders";
import { useSettingsStore } from "@/stores/SettingsStore";
import { PromptOptimizerSettings } from "@/components/settings/PromptOptimizerSettings";
import { RemoteAccessSettings } from "@/components/settings/RemoteAccessSettings";

export default function SettingsPage() {
  const { activeSection, setActiveSection } = useSettingsStore();
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");
  const providerNames = [
    "openai",
    "google",
    "ollama",
    "openrouter",
    "xai"
  ];

  return (
    <div className="flex h-screen">
      <SettingsSidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      
      <div className="flex-1 px-6 overflow-y-auto">
        {activeSection === "provider" && (
          <div className="grid grid-cols-3 gap-6">
            <ProviderList 
              providers={providerNames}
              selectedProvider={selectedProvider}
              onProviderSelect={setSelectedProvider}
            />
            <ProviderModels 
              selectedProvider={selectedProvider}
            />
          </div>
        )}
        {activeSection === "promptOptimizer" && <PromptOptimizerSettings />}
        {activeSection === "remoteAccess" && <RemoteAccessSettings />}
        {activeSection === "exclude" && <ExcludeFolders />}
      </div>
    </div>
  );
}
