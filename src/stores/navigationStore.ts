import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, Project } from "@/lib/api";

type MainViewType =
  | "codex"
  | "cc"
  | "project"
  | "mcp"
  | "usage"
  | "agents-editor"
  | "claude-md-editor"
  | "cc-app"
  | "notepad"
  | "settings"
  | "login"
  | null;
type RightViewType = "notepad" | "webPreview" | "editor" | "gitDiff" | null;

interface NavigationState {
  // Left panel view (Codex, CC, FileTree, or none)
  mainView: MainViewType;
  setMainView: (view: MainViewType) => void;

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
      rightView: null,
      selectedProject: null,
      selectedSession: null,
      sidebarVisible: true,

      // Actions
      setMainView: (view: MainViewType) =>
        set({
          mainView: view,
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
        rightView: state.rightView,
        sidebarVisible: state.sidebarVisible,
      }),
    },
  ),
);
