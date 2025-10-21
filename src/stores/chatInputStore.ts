import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MediaAttachment } from '@/types/chat';

interface FileReference {
  path: string;
  relativePath: string;
  name: string;
  isDirectory: boolean;
}

interface ChatInputStore {
  // File references for current input
  fileReferences: FileReference[];
  
  // Media attachments (images, audio)
  mediaAttachments: MediaAttachment[];
  
  // Input value (not persisted)
  inputValue: string;

  // Prompt optimization history (local stack, not persisted)
  promptHistory: string[];
  
  // Actions for file references
  addFileReference: (path: string, relativePath: string, name: string, isDirectory: boolean) => void;
  removeFileReference: (path: string) => void;
  clearFileReferences: () => void;
  replaceFileReferences: (files: FileReference[]) => void;
  
  // Actions for media attachments
  addMediaAttachment: (attachment: MediaAttachment) => void;
  removeMediaAttachment: (id: string) => void;
  clearMediaAttachments: () => void;
  
  // Input actions
  setInputValue: (value: string) => void;
  appendToInput: (value: string) => void;

  // Optional external setter to keep legacy props in sync
  setExternalSetter: (setter: ((value: string) => void) | null) => void;
  // Internal reference used by the setter above (not persisted)
  _externalSetter?: ((value: string) => void) | null;

  // Prompt optimization history actions
  pushPromptHistory: (value: string) => void;
  popPromptHistory: () => string | null;
  clearPromptHistory: () => void;
  
  // Focus control
  focusSignal: number;
  requestFocus: () => void;
  
  // Edit & resend target
  editingTarget: { conversationId: string; messageId: string } | null;
  setEditingTarget: (conversationId: string, messageId: string) => void;
  clearEditingTarget: () => void;

  // Clear all
  clearAll: () => void;
  
  // Utility
  hasFileReference: (path: string) => boolean;
  hasMediaAttachment: (path: string) => boolean;
}

export const useChatInputStore = create<ChatInputStore>()(
  persist(
    (set, get) => ({
      fileReferences: [],
      mediaAttachments: [],
      inputValue: "",
      promptHistory: [],
      
      // Focus control (increments to trigger effects)
      focusSignal: 0,
      editingTarget: null,

      // File reference actions
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

      // Media attachment actions
      addMediaAttachment: (attachment: MediaAttachment) => {
        const { mediaAttachments } = get();
        const exists = mediaAttachments.some(media => media.path === attachment.path);
        
        if (!exists) {
          set({
            mediaAttachments: [...mediaAttachments, attachment]
          });
        }
      },

      removeMediaAttachment: (id: string) => {
        set((state) => ({
          mediaAttachments: state.mediaAttachments.filter(media => media.id !== id)
        }));
      },

      clearMediaAttachments: () => {
        set({ mediaAttachments: [] });
      },

      // Input actions – also sync with optional external setter for compatibility
      setInputValue: (value: string) => {
        set({ inputValue: value });
        const external = get()._externalSetter;
        if (external) external(value);
      },

      appendToInput: (value: string) => {
        const { inputValue } = get();
        const separator = inputValue.trim() ? '\n\n' : '';
        const newVal = inputValue + separator + value;
        set({ inputValue: newVal });
        const external = get()._externalSetter;
        if (external) external(newVal);
      },

      pushPromptHistory: (value: string) => {
        const { promptHistory } = get();
        const lastEntry = promptHistory[promptHistory.length - 1];
        const shouldAdd = value.trim().length > 0 && value !== lastEntry;

        if (!shouldAdd) {
          return;
        }

        set({ promptHistory: [value] });
      },

      popPromptHistory: () => {
        const { promptHistory } = get();
        if (promptHistory.length === 0) {
          return null;
        }

        const previousValue = promptHistory[promptHistory.length - 1];
        set({ promptHistory: promptHistory.slice(0, -1) });
        return previousValue;
      },

      clearPromptHistory: () => {
        set({ promptHistory: [] });
      },
      
      // Focus control: bump signal to notify listeners
      requestFocus: () => {
        set((state) => ({ focusSignal: state.focusSignal + 1 }));
      },

      // Register an external setter (used by components still relying on
      // currentMessage/setCurrentMessage props). Syncs store updates to the
      // external state.
      setExternalSetter: (setter) => {
        set({ _externalSetter: setter });
      },

      // Clear all
      clearAll: () => {
        set({ 
          fileReferences: [],
          mediaAttachments: [],
          inputValue: "",
          promptHistory: [],
        });
      },

      // Edit target
      setEditingTarget: (conversationId: string, messageId: string) => {
        set({ editingTarget: { conversationId, messageId } });
      },
      clearEditingTarget: () => {
        set({ editingTarget: null });
      },

      // Utilities
      hasFileReference: (path: string) => {
        const { fileReferences } = get();
        return fileReferences.some(ref => ref.path === path);
      },

      hasMediaAttachment: (path: string) => {
        const { mediaAttachments } = get();
        return mediaAttachments.some(media => media.path === path);
      },
    }),
    {
      name: 'codexia-chat-input-store',
      // Only persist references, not input value
      partialize: (state) => ({
        fileReferences: state.fileReferences,
        mediaAttachments: state.mediaAttachments,
      }),
    }
  )
);
