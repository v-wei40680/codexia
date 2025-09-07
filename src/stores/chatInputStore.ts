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

      // Input actions
      setInputValue: (value: string) => {
        set({ inputValue: value });
      },

      appendToInput: (value: string) => {
        const { inputValue } = get();
        const separator = inputValue.trim() ? '\n\n' : '';
        set({ inputValue: inputValue + separator + value });
      },
      
      // Focus control: bump signal to notify listeners
      requestFocus: () => {
        set((state) => ({ focusSignal: state.focusSignal + 1 }));
      },

      // Clear all
      clearAll: () => {
        set({ 
          fileReferences: [],
          mediaAttachments: [],
          inputValue: ""
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
