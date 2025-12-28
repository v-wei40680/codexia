import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, Project } from "@/lib/api";

type MainViewType =
  | "project"
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

  // Selected project for CC view
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;

  // Selected session to display
  selectedSession: Session | null;
  setSelectedSession: (session: Session | null) => void;

  // Sidebar visibility
  sidebarVisible: boolean;
  setSidebarVisible: (visible: boolean) => void;
}

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      // Initial state
      mainView: "project",
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

      setSelectedProject: (project: Project | null) =>
        set({
          selectedProject: project,
        }),

      setSelectedSession: (session: Session | null) =>
        set({
          selectedSession: session,
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
