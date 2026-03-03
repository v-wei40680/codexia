import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCCInputStore } from './useCCInputStore';
import { useWorkspaceStore } from './useWorkspaceStore';

interface InputStore {
  inputValue: string;
  setInputValue: (value: string) => void;
  appendInputValue: (value: string) => void;
  clearInputValue: () => void;
}

export const useInputStore = create<InputStore>()(
  persist(
    (set) => ({
      inputValue: '',
      setInputValue: (value) => {
        const { selectedAgent } = useWorkspaceStore.getState();
        if (selectedAgent === 'cc') {
          useCCInputStore.getState().setInputValue(value);
          return;
        }
        set({ inputValue: value });
      },
      appendInputValue: (value) => {
        const { selectedAgent } = useWorkspaceStore.getState();
        if (selectedAgent === 'cc') {
          useCCInputStore.getState().appendInputValue(value);
          return;
        }
        set((state) => {
          const separator =
            state.inputValue.length === 0 || state.inputValue.endsWith(' ') ? '' : ' ';
          return { inputValue: `${state.inputValue}${separator}${value}` };
        });
      },
      clearInputValue: () => {
        const { selectedAgent } = useWorkspaceStore.getState();
        if (selectedAgent === 'cc') {
          useCCInputStore.getState().clearInputValue();
          return;
        }
        set({ inputValue: '' });
      },
    }),
    {
      name: 'input-storage',
      version: 2,
    }
  )
);
