import { invoke } from "@/lib/tauri-proxy";
import { useState } from "react";
import SettingsSidebar from "@/components/settings/SettingsSidebar";
import ExcludeFolders from "@/components/settings/ExcludeFolders";
import { RateLimitSettings, CodexAuth } from "@/components/settings";
import { useSettingsStore } from "@/stores/settings/SettingsStore";
import { PromptOptimizerSettings } from "@/components/settings/PromptOptimizerSettings";
import { RemoteAccessSettings } from "@/components/settings/RemoteAccessSettings";
import { GitWorktreeSettings } from "@/components/settings/GitWorktreeSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function EnvironmentVariablesSettings() {
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState<string | null>(null);
  const [setEnvKeyInput, setSetEnvKeyInput] = useState("");
  const [setEnvValueInput, setSetEnvValueInput] = useState("");
  const [setEnvStatus, setSetEnvStatus] = useState<string | null>(null);

  const handleGetEnv = async () => {
    try {
      const result = await invoke<string | null>("get_system_env", { key: envKey });
      setEnvValue(result);
    } catch (error) {
      console.error("Failed to get env var:", error);
      setEnvValue(`Error: ${error}`);
    }
  };

  const handleSetEnv = async () => {
    try {
      await invoke("set_system_env", { key: setEnvKeyInput, value: setEnvValueInput });
      setSetEnvStatus("Environment variable set successfully!");
    } catch (error) {
      console.error("Failed to set env var:", error);
      setSetEnvStatus(`Error: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Environment Variables</h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="envKeyInput">Environment Variable Key</Label>
          <Input
            id="envKeyInput"
            value={envKey}
            onChange={(e) => setEnvKey(e.target.value)}
            placeholder="Enter environment variable key"
          />
          <Button onClick={handleGetEnv} className="mt-2">Get Environment Variable</Button>
        </div>
        {envValue !== null && (
          <div>
            <Label>Value:</Label>
            <p className="p-2 border rounded bg-gray-100 dark:bg-gray-700 break-all">{envValue || "(Not set)"}</p>
          </div>
        )}
      </div>

      <div className="space-y-4 mt-6">
        <h3 className="text-xl font-semibold">Set Environment Variable</h3>
        <div>
          <Label htmlFor="setEnvKeyInput">Key</Label>
          <Input
            id="setEnvKeyInput"
            value={setEnvKeyInput}
            onChange={(e) => setSetEnvKeyInput(e.target.value)}
            placeholder="Enter key to set"
          />
        </div>
        <div>
          <Label htmlFor="setEnvValueInput">Value</Label>
          <Input
            id="setEnvValueInput"
            value={setEnvValueInput}
            onChange={(e) => setSetEnvValueInput(e.target.value)}
            placeholder="Enter value to set"
          />
          <Button onClick={handleSetEnv} className="mt-2">Set Environment Variable</Button>
        </div>
        {setEnvStatus && (
          <p className="text-sm text-muted-foreground">{setEnvStatus}</p>
        )}
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
        {activeSection === "environmentVariables" && <EnvironmentVariablesSettings />}
      </div>
    </div>
  );
}
