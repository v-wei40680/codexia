import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentType = 'codex' | 'cc';
export type ProjectSortKey = 'added_desc' | 'added_asc' | 'name_asc' | 'name_desc';
const MAX_HISTORY_PROJECTS = 30;

function normalizeProjectPath(project: string): string {
  return project.trim();
}

function dedupeProjects(projects: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const project of projects) {
    const normalized = normalizeProjectPath(project);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    next.push(normalized);
  }
  return next;
}

function pushRecentProject(history: string[], project: string): string[] {
  const normalized = normalizeProjectPath(project);
  if (!normalized) {
    return history;
  }
  const withoutCurrent = history.filter((item) => item !== normalized);
  return [normalized, ...withoutCurrent].slice(0, MAX_HISTORY_PROJECTS);
}

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
  removeProject: (project: string) => void;
  addProjectAndSelect: (project: string) => void;
  historyProjects: string[];
  setHistoryProjects: (projects: string[]) => void;
  addHistoryProject: (project: string) => void;
  clearHistoryProjects: () => void;
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
    (set, get) => ({
      selectedAgent: 'codex',
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      projects: [],
      setProjects: (projects) => set({ projects: dedupeProjects(projects) }),
      addProject: (project) =>
        set((state) => {
          const normalized = normalizeProjectPath(project);
          if (!normalized) {
            return state;
          }
          return {
            projects: state.projects.includes(normalized)
              ? state.projects
              : [...state.projects, normalized],
            historyProjects: pushRecentProject(state.historyProjects, normalized),
          };
        }),
      removeProject: (project) =>
        set((state) => {
          const normalized = normalizeProjectPath(project);
          const projects = state.projects.filter((p) => p !== normalized);
          const shouldClearCwd = state.cwd === normalized;
          const nextCwd = shouldClearCwd ? projects[0] ?? '' : state.cwd;

          return {
            projects,
            cwd: nextCwd,
            selectedFilePath: shouldClearCwd ? null : state.selectedFilePath,
          };
        }),
      addProjectAndSelect: (project) => {
        const trimmed = normalizeProjectPath(project);
        const state = get();
        if (trimmed && !state.projects.includes(trimmed)) {
          set({
            projects: [...state.projects, trimmed],
            cwd: trimmed,
            historyProjects: pushRecentProject(state.historyProjects, trimmed),
          });
        }
      },
      historyProjects: [],
      setHistoryProjects: (projects) => set({ historyProjects: dedupeProjects(projects) }),
      addHistoryProject: (project) =>
        set((state) => ({
          historyProjects: pushRecentProject(state.historyProjects, project),
        })),
      clearHistoryProjects: () => set({ historyProjects: [] }),
      projectSort: 'added_desc',
      setProjectSort: (sortKey) => set({ projectSort: sortKey }),
      historyMode: false,
      setHistoryMode: (historyMode) => set({ historyMode }),
      cwd: '',
      setCwd: (path) => {
        const normalized = normalizeProjectPath(path);
        set((state) => ({
          cwd: normalized,
          selectedFilePath: null,
          historyProjects: pushRecentProject(state.historyProjects, normalized),
        }));
      },
      selectedFilePath: null,
      setSelectedFilePath: (path) => set({ selectedFilePath: path }),
      instructionType: 'system',
      setInstructionType: (type) => set({ instructionType: type }),
    }),
    {
      name: 'workspace-store',
      version: 3,
    }
  )
);
