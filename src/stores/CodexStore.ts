import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CodexConfig, DEFAULT_CONFIG } from "@/types/codex";

interface CodexStore {
  config: CodexConfig;
  setConfig: (config: CodexConfig) => void;
  updateConfig: (updates: Partial<CodexConfig>) => void;
  resetConfig: () => void;
}

export const useCodexStore = create<CodexStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,

      setConfig: (config) => {
        set({ config });
      },

      updateConfig: (updates) => {
        set((state) => ({
          config: { ...state.config, ...updates }
        }));
      },

      resetConfig: () => {
        set({ config: DEFAULT_CONFIG });
      },
    }),
    {
      name: "codex-config-storage",
      version: 1,
      partialize: (state) => ({
        config: state.config,
      }),
    },
  ),
);