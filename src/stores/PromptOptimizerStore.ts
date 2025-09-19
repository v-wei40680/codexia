import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PromptOptimizerState {
  provider: string;
  model: string;
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  setSettings: (provider: string, model: string) => void;
}

const DEFAULT_PROVIDER = 'google';
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export const usePromptOptimizerStore = create<PromptOptimizerState>()(
  persist(
    (set) => ({
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      setProvider: (provider: string) => set({ provider }),
      setModel: (model: string) => set({ model }),
      setSettings: (provider: string, model: string) => set({ provider, model }),
    }),
    {
      name: 'prompt-optimizer-settings',
    },
  ),
);
