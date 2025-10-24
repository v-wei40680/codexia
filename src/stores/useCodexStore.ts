import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CodexState {
  cwd: string | null;
  webSearchEnabled: boolean;
  setCwd: (cwd: string | null) => void;
  clearCwd: () => void;
  toggleWebSearch: () => void;
}

export const useCodexStore = create<CodexState>()(
  persist(
    (set) => ({
      cwd: null,
      webSearchEnabled: false,
      setCwd: (cwd) => set({ cwd }),
      clearCwd: () => set({ cwd: null }),
      toggleWebSearch: () =>
        set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),
    }),
    {
      name: "codex",
    },
  ),
);
