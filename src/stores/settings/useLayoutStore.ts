import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type viewType =
  | 'codex'
  | 'cc'
  | 'automate'
  | 'agents'
  | 'history'
  | 'login'
  | 'marketplace'
  | 'settings'
  | 'usage';

interface LayoutStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isRightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  view: viewType;
  setView: (view: viewType) => void;
  activeSidebarTab: 'codex' | 'cc' | 'explorer';
  setActiveSidebarTab: (tab: 'codex' | 'cc' | 'explorer') => void;
  activeRightPanelTab: 'diff' | 'note' | 'files' | 'webpreview';
  setActiveRightPanelTab: (tab: 'diff' | 'note' | 'files' | 'webpreview') => void;
  isConfigLess: boolean;
  setIsConfigLess: (isConfigLess: boolean) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      isRightPanelOpen: false,
      toggleRightPanel: () => set((state) => ({ isRightPanelOpen: !state.isRightPanelOpen })),
      setRightPanelOpen: (open) => set({ isRightPanelOpen: open }),
      view: 'codex',
      setView: (view) => set({ view: view }),
      activeSidebarTab: 'codex',
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      activeRightPanelTab: 'note',
      setActiveRightPanelTab: (tab) => set({ activeRightPanelTab: tab }),
      isConfigLess: false,
      setIsConfigLess: (isConfigLess) => set({ isConfigLess }),
    }),
    {
      name: 'layout-storage',
    }
  )
);
