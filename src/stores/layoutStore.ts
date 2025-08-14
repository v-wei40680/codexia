import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  // Panel visibility
  showFilePanel: boolean;
  showSessionList: boolean;
  showChatPane: boolean;
  showFileTree: boolean;
  showNotesList: boolean;
  
  // Selected file
  selectedFile: string | null;
  
  // Actions
  setFilePanel: (visible: boolean) => void;
  setSessionList: (visible: boolean) => void;
  setNotesList: (visible: boolean) => void;
  setChatPane: (visible: boolean) => void;
  setFileTree: (visible: boolean) => void;
  toggleSessionList: () => void;
  toggleNotesList: () => void;
  toggleChatPane: () => void;
  toggleFileTree: () => void;
  openFile: (filePath: string) => void;
  closeFile: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, _get) => ({
      // Initial state
      showFilePanel: false,
      showSessionList: true,
      showChatPane: true,
      showFileTree: true,
      showNotesList: true,
      selectedFile: null,
      
      // Actions
      setFilePanel: (visible) => set({ showFilePanel: visible }),
      setSessionList: (visible) => set({ showSessionList: visible }),
      setNotesList: (visible) => set({ showNotesList: visible }),
      setChatPane: (visible) => set({ showChatPane: visible }),
      setFileTree: (visible) => set({ showFileTree: visible }),
      
      toggleSessionList: () => set((state) => ({ 
        showSessionList: !state.showSessionList 
      })),
      
      toggleNotesList: () => set((state) => ({ 
        showNotesList: !state.showNotesList 
      })),
      
      toggleChatPane: () => set((state) => ({ showChatPane: !state.showChatPane })),
      toggleFileTree: () => set((state) => ({ showFileTree: !state.showFileTree })),
      
      openFile: (filePath) => set({ 
        selectedFile: filePath, 
        showFilePanel: true 
      }),
      
      closeFile: () => set({ 
        selectedFile: null, 
        showFilePanel: false 
      }),
    }),
    {
      name: 'layout-store',
      partialize: (state) => ({
        showSessionList: state.showSessionList,
        showChatPane: state.showChatPane,
        showFileTree: state.showFileTree,
        showNotesList: state.showNotesList,
      }),
    }
  )
);