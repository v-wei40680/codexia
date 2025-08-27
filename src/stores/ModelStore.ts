import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ModelStore {
  currentModel: string;
  currentProvider: string;
  setCurrentModel: (model: string, provider: string) => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set) => ({
      currentModel: 'gpt-5',
      currentProvider: 'openai',
      setCurrentModel: (model: string, provider: string) =>
        set({ currentModel: model, currentProvider: provider }),
    }),
    {
      name: "model-storage",
    },
  ),
);