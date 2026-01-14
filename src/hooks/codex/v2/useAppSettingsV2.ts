import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "@/types/codex-v2";
import { getAppSettings, updateAppSettings } from "@/services/tauri";

const defaultSettings: AppSettings = {
  defaultAccessMode: "current",
};

export function useAppSettingsV2() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await getAppSettings();
        if (active) {
          setSettings({
            ...defaultSettings,
            ...response,
          });
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = useCallback(async (next: AppSettings) => {
    const saved = await updateAppSettings(next);
    setSettings({
      ...defaultSettings,
      ...saved,
    });
    return saved;
  }, []);


  return {
    settings,
    setSettings,
    saveSettings,
    isLoading,
  };
}
