import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FileReference {
  path: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
}

interface ChatInputStore {
  // File references for current input
  fileReferences: FileReference[];
  
  // Input value (not persisted)
  inputValue: string;
  
  // Actions
  addFileReference: (path: string, relativePath: string, name: string, isDirectory: boolean) => void;
  removeFileReference: (path: string) => void;
  clearFileReferences: () => void;
  replaceFileReferences: (files: FileReference[]) => void;
  setInputValue: (value: string) => void;
  appendToInput: (value: string) => void;
  
  // Utility
  hasFileReference: (path: string) => boolean;
}

export const useChatInputStore = create<ChatInputStore>()(
  persist(
    (set, get) => ({
      fileReferences: [],
      inputValue: "",

      addFileReference: (path: string, relativePath: string, name: string, isDirectory: boolean) => {
        const { fileReferences } = get();
        const exists = fileReferences.some(ref => ref.path === path);
        
        if (!exists) {
          set({
            fileReferences: [...fileReferences, { path, relativePath, name, isDirectory }]
          });
        }
      },

      removeFileReference: (path: string) => {
        set((state) => ({
          fileReferences: state.fileReferences.filter(ref => ref.path !== path)
        }));
      },

      clearFileReferences: () => {
        set({ fileReferences: [] });
      },

      replaceFileReferences: (files: FileReference[]) => {
        set({ fileReferences: files });
      },

      setInputValue: (value: string) => {
        set({ inputValue: value });
      },

      appendToInput: (value: string) => {
        const { inputValue } = get();
        const separator = inputValue.trim() ? '\n\n' : '';
        set({ inputValue: inputValue + separator + value });
      },

      hasFileReference: (path: string) => {
        const { fileReferences } = get();
        return fileReferences.some(ref => ref.path === path);
      },
    }),
    {
      name: 'codexia-chat-input-store',
      // Only persist file references
      partialize: (state) => ({
        fileReferences: state.fileReferences,
      }),
    }
  )
);