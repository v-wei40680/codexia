import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CCSettingsState {
  enabledThinking: boolean;
  toggleThinking: () => void;
}

export const useCCSettingsStore = create<CCSettingsState>()(
  persist(
    (set) => ({
      enabledThinking: false,
      toggleThinking: () => set((state) => ({ enabledThinking: !state.enabledThinking })),
    }),
    {
      name: 'cc-settings',
    }
  )
);
