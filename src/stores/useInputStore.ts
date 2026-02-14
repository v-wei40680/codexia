import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      setInputValue: (value) => set({ inputValue: value }),
      appendInputValue: (value) =>
        set((state) => {
          const separator =
            state.inputValue.length === 0 || state.inputValue.endsWith(' ') ? '' : ' ';
          return { inputValue: `${state.inputValue}${separator}${value}` };
        }),
      clearInputValue: () => set({ inputValue: '' }),
    }),
    {
      name: 'input-storage',
      version: 2,
    }
  )
);
