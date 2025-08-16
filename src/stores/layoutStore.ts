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
  
  // Active tab
  activeTab: string;
  
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
  setActiveTab: (tab: string) => void;
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
      activeTab: 'chat',
      
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
      
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'layout-store',
      partialize: (state) => ({
        showSessionList: state.showSessionList,
        showChatPane: state.showChatPane,
        showFileTree: state.showFileTree,
        showNotesList: state.showNotesList,
        activeTab: state.activeTab,
      }),
    }
  )
);