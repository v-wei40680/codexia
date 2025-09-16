import { create } from "zustand";
import { persist } from "zustand/middleware";

type ReasoningEffort = 'high' | 'medium' | 'low' | 'minimal';

interface ModelStore {
  currentModel: string;
  currentProvider: string;
  reasoningEffort: ReasoningEffort;
  setCurrentModel: (model: string, provider: string) => void;
  setReasoningEffort: (effort: ReasoningEffort) => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set) => ({
      currentModel: 'gpt-5-codex',
      currentProvider: 'openai',
      reasoningEffort: 'medium',
      setCurrentModel: (model: string, provider: string) =>
        set({ currentModel: model, currentProvider: provider }),
      setReasoningEffort: (effort: ReasoningEffort) =>
        set({ reasoningEffort: effort }),
    }),
    {
      name: "model-storage",
    },
  ),
);
