import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentType = 'codex' | 'cc';
export type ProjectSortKey = 'added_desc' | 'added_asc' | 'name_asc' | 'name_desc';

export function sortProjects(projects: string[], sortKey: ProjectSortKey): string[] {
  const next = [...projects];
  if (sortKey === 'added_desc') {
    return next.reverse();
  }
  if (sortKey === 'added_asc') {
    return next;
  }
  return next.sort((a, b) =>
    sortKey === 'name_asc'
      ? a.localeCompare(b, undefined, { sensitivity: 'base' })
      : b.localeCompare(a, undefined, { sensitivity: 'base' })
  );
}

interface WorkspaceStore {
  selectedAgent: AgentType;
  setSelectedAgent: (agent: AgentType) => void;
  projects: string[];
  setProjects: (projects: string[]) => void;
  addProject: (project: string) => void;
  projectSort: ProjectSortKey;
  setProjectSort: (sortKey: ProjectSortKey) => void;
  historyMode: boolean;
  setHistoryMode: (historyMode: boolean) => void;
  cwd: string;
  setCwd: (path: string) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  instructionType: string;
  setInstructionType: (type: string) => void;
}

export const useWorkspaceStore = create(
  persist<WorkspaceStore>(
    (set) => ({
      selectedAgent: 'codex',
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      projects: [],
      setProjects: (projects) => set({ projects }),
      addProject: (project) =>
        set((state) => {
          const trimmed = project.trim();
          if (!trimmed || state.projects.includes(trimmed)) {
            return state;
          }
          set({ cwd: trimmed });
          return { projects: [...state.projects, trimmed] };
        }),
      projectSort: 'added_desc',
      setProjectSort: (sortKey) => set({ projectSort: sortKey }),
      historyMode: false,
      setHistoryMode: (historyMode) => set({ historyMode }),
      cwd: '',
      setCwd: (path) => {
        set({ cwd: path, selectedFilePath: null });
      },
      selectedFilePath: null,
      setSelectedFilePath: (path) => set({ selectedFilePath: path }),
      instructionType: 'system',
      setInstructionType: (type) => set({ instructionType: type }),
    }),
    {
      name: 'workspace-store',
      version: 2,
    }
  )
);
