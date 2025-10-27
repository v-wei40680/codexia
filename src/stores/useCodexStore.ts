import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CodexState {
  cwd: string;
  webSearchEnabled: boolean;
  setCwd: (cwd: string) => void;
  toggleWebSearch: () => void;
}

export const useCodexStore = create<CodexState>()(
  persist(
    (set) => ({
      cwd: "",
      webSearchEnabled: false,
      setCwd: (cwd) => set({ cwd }),
      toggleWebSearch: () =>
        set((state) => ({ webSearchEnabled: !state.webSearchEnabled })),
    }),
    {
      name: "codex",
    },
  ),
);
