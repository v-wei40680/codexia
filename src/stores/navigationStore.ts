import { create } from "zustand";
import { persist } from "zustand/middleware";

type MainViewType =
  | "home"
  | "codex"
  | "cc"
  | "agents-editor"
  | "claude-md-editor"
  | "cc-app"
  | "notepad"
  | "prompt"
  | "login"
  | "mcp"
  | "skills"
  | "settings"
  | "usage"
  | null;
type SidebarTabType =
  | "codex"
  | "cc"
  | "cc-app"
  | "prompt"
  | "mcp"
  | "skills"
  | "usage"
  | "settings"
  | null;
type SubTabType = "main" | "fileTree" | "git";
type RightViewType = "notepad" | "webPreview" | "editor" | "gitDiff" | null;

interface NavigationState {
  // Main panel view (Projects, Codex, CC, etc.)
  mainView: MainViewType;
  setMainView: (view: MainViewType) => void;

  // Sidebar tab (what shows in the left sidebar content area)
  sidebarTab: SidebarTabType;
  setSidebarTab: (tab: SidebarTabType) => void;

  // Sub-tab for codex and cc views (main, fileTree, git)
  subTab: SubTabType;
  setSubTab: (tab: SubTabType) => void;

  // Right panel view (FileExplorer, Notepad)
  rightView: RightViewType;
  setRightView: (view: RightViewType) => void;

  // Sidebar visibility
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      // Initial state
      mainView: "home",
      sidebarTab: null,
      subTab: "main",
      rightView: null,
      selectedProject: null,
      selectedSession: null,
      sidebarVisible: true,

      // Actions
      setMainView: (view: MainViewType) =>
        set({
          mainView: view,
        }),

      setSidebarTab: (tab: SidebarTabType) =>
        set({
          sidebarTab: tab,
        }),

      setSubTab: (tab: SubTabType) =>
        set({
          subTab: tab,
        }),

      setRightView: (view: RightViewType) =>
        set({
          rightView: view,
        }),

      setSidebarVisible: (visible: boolean) =>
        set({
          sidebarVisible: visible,
        }),
    }),
    {
      name: "navigation-store",
      partialize: (state) => ({
        mainView: state.mainView,
        sidebarTab: state.sidebarTab,
        subTab: state.subTab,
        rightView: state.rightView,
        sidebarVisible: state.sidebarVisible,
      }),
    },
  ),
);
