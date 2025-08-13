import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  // Panel visibility
  isFilePanelVisible: boolean;
  isSessionListVisible: boolean;
  
  // Selected file
  selectedFile: string | null;
  
  // Actions
  setFilePanelVisible: (visible: boolean) => void;
  setSessionListVisible: (visible: boolean) => void;
  setSelectedFile: (file: string | null) => void;
  toggleSessionList: () => void;
  openFile: (filePath: string) => void;
  closeFile: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, _get) => ({
      // Initial state
      isFilePanelVisible: false,
      isSessionListVisible: true,
      selectedFile: null,
      
      // Actions
      setFilePanelVisible: (visible) => set({ isFilePanelVisible: visible }),
      setSessionListVisible: (visible) => set({ isSessionListVisible: visible }),
      setSelectedFile: (file) => set({ selectedFile: file }),
      
      toggleSessionList: () => set((state) => ({ 
        isSessionListVisible: !state.isSessionListVisible 
      })),
      
      openFile: (filePath) => set({ 
        selectedFile: filePath, 
        isFilePanelVisible: true 
      }),
      
      closeFile: () => set({ 
        selectedFile: null, 
        isFilePanelVisible: false 
      }),
    }),
    {
      name: 'layout-store',
      partialize: (state) => ({
        isSessionListVisible: state.isSessionListVisible,
      }),
    }
  )
);