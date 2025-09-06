import { useState } from "react";
import SettingsSidebar from "@/components/SettingsSidebar";
import ProviderList from "@/components/ProviderList";
import ProviderModels from "@/components/ProviderModels";
import ExcludeFolders from "@/components/ExcludeFolders";
import LogoSettings from "@/components/LogoSettings";
import UpdaterComponent from "@/components/UpdaterComponent";
import { useSettingsStore } from "@/stores/SettingsStore";

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
        {activeSection === "security" && <p>Security Settings</p>}
        {activeSection === "working" && <p>Working Directory Settings</p>}
        {activeSection === "exclude" && <ExcludeFolders />}
        {activeSection === "logo" && <LogoSettings />}
        {activeSection === "updates" && (
          <div className="py-6">
            <h2 className="text-2xl font-bold mb-6">Application Updates</h2>
            <UpdaterComponent />
          </div>
        )}
      </div>
    </div>
  );
}
