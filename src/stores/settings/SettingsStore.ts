import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isRemoteRuntime } from "@/lib/tauri-proxy";

interface SettingsStore {
  excludeFolders: string[];
  addExcludeFolder: (folder: string) => void;
  removeExcludeFolder: (folder: string) => void;
  setExcludeFolders: (folders: string[]) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  logoSettings: {
    useCustomLogo: boolean;
    customLogoPath: string;
  };
  setUseCustomLogo: (use: boolean) => void;
  setCustomLogoPath: (path: string) => void;
  windowTitle: string;
  setWindowTitle: (title: string) => void;
  autoCommitGitWorktree: boolean;
  setAutoCommitGitWorktree: (enabled: boolean) => void;
}

const DEFAULT_EXCLUDE_FOLDERS = [
  ".git",
  "node_modules",
  ".venv",
  "__pycache__",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".DS_Store",
  "target",
  ".cargo",
];


export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, _get) => ({
      excludeFolders: DEFAULT_EXCLUDE_FOLDERS,
      activeSection: "promptOptimizer",
      logoSettings: {
        useCustomLogo: false,
        customLogoPath: "",
      },
      windowTitle: "Codexia",
      autoCommitGitWorktree: true,
      addExcludeFolder: (folder: string) =>
        set((state) => ({
          excludeFolders: [...state.excludeFolders, folder],
        })),
      removeExcludeFolder: (folder: string) =>
        set((state) => ({
          excludeFolders: state.excludeFolders.filter((f) => f !== folder),
        })),
      setExcludeFolders: (folders: string[]) =>
        set({ excludeFolders: folders }),
      setActiveSection: (section: string) =>
        set({ activeSection: section }),
      setUseCustomLogo: (use: boolean) =>
        set((state) => ({
          logoSettings: { ...state.logoSettings, useCustomLogo: use },
        })),
      setCustomLogoPath: (path: string) =>
        set((state) => ({
          logoSettings: { ...state.logoSettings, customLogoPath: path },
        })),
      setWindowTitle: (title: string) => {
        set({ windowTitle: title });
        (async () => {
          if (isRemoteRuntime()) {
            return;
          }

          try {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            await getCurrentWindow().setTitle(title);
          } catch (error) {
            console.error("Failed to update window title:", error);
          }
        })();
      },
      setAutoCommitGitWorktree: (enabled: boolean) => set({ autoCommitGitWorktree: enabled }),
    }),
    {
      name: "settings-storage",
    },
  ),
);
