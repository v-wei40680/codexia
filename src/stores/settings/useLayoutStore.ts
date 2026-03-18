import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AgentType } from '../useWorkspaceStore';

export type viewType =
  | 'automations'
  | 'agents'
  | 'agent'
  | 'history'
  | 'learn'
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
  rightPanelSize: number;
  setRightPanelSize: (size: number) => void;
  view: viewType;
  setView: (view: viewType) => void;
  currentCard: { kind: 'codex'; id: string } | { kind: 'cc'; id: string } | null;
  setCurrentAgentCard: (card: { kind: 'codex'; id: string } | { kind: 'cc'; id: string } | null) => void;
  activeSidebarTab: AgentType;
  setActiveSidebarTab: (tab: AgentType) => void;
  activeRightPanelTab: 'diff' | 'note' | 'files' | 'webpreview';
  setActiveRightPanelTab: (tab: 'diff' | 'note' | 'files' | 'webpreview') => void;
  selectedAutomationTaskId: string | null;
  setSelectedAutomationTaskId: (taskId: string | null) => void;
  isTerminalOpen: boolean;
  setIsTerminalOpen: (open: boolean) => void;
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
      rightPanelSize: 45,
      setRightPanelSize: (size) => set({ rightPanelSize: size }),
      view: 'agent',
      setView: (view) => set({ view: view }),
      currentCard: null,
      setCurrentAgentCard: (card) => set({ currentCard: card }),
      activeSidebarTab: 'codex',
      setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
      activeRightPanelTab: 'note',
      setActiveRightPanelTab: (tab) => set({ activeRightPanelTab: tab }),
      selectedAutomationTaskId: null,
      setSelectedAutomationTaskId: (taskId) => set({ selectedAutomationTaskId: taskId }),
      isTerminalOpen: false,
      setIsTerminalOpen: (open) => set({ isTerminalOpen: open }),
    }),
    {
      name: 'layout-storage',
      version: 2,
    }
  )
);
