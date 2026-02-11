import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskDetail = 'steps' | 'stepsWithCommand' | 'stepsWithOutput';

export interface SettingState {
  isCoworkMode: boolean;
  setIsCoworkMode: (isCoworkMode: boolean) => void;
  hiddenNames: string[];
  showExplorer: boolean;
  taskDetail: TaskDetail;
  setHiddenNames: (hiddenNames: string[]) => void;
  addHiddenName: (name: string) => void;
  removeHiddenName: (name: string) => void;
  resetHiddenNames: () => void;
  setShowExplorer: (showExplorer: boolean) => void;
  setTaskDetail: (taskDetail: TaskDetail) => void;
  autoCommitGitWorktree: boolean;
  setAutoCommitGitWorktree: (enabled: boolean) => void;
  enableTaskCompleteBeep: boolean;
  setEnableTaskCompleteBeep: (enabled: boolean) => void;
  preventSleepDuringTasks: boolean;
  setPreventSleepDuringTasks: (enabled: boolean) => void;
  enabledQuoteCategories: string[];
  setEnabledQuoteCategories: (categories: string[]) => void;
}

const DEFAULT_HIDDEN_NAMES = [
  'node_modules',
  'DS_Store',
  '.git',
  '__pycache__',
  '.venv',
  '.vscode',
  '.idea',
  '.pytest_cache',
  '.mypy_cache',
  '.eggs',
  'target',
];

export const useSettingsStore = create<SettingState>()(
  persist(
    (set) => ({
      isCoworkMode: false,
      setIsCoworkMode: (isCoworkMode: boolean) => set({ isCoworkMode }),
      hiddenNames: DEFAULT_HIDDEN_NAMES,
      showExplorer: true,
      taskDetail: 'steps',
      setHiddenNames: (hiddenNames: string[]) => set({ hiddenNames }),
      addHiddenName: (name: string) =>
        set((state) =>
          state.hiddenNames.includes(name) ? state : { hiddenNames: [...state.hiddenNames, name] }
        ),
      removeHiddenName: (name: string) =>
        set((state) => ({ hiddenNames: state.hiddenNames.filter((item) => item !== name) })),
      resetHiddenNames: () => set({ hiddenNames: DEFAULT_HIDDEN_NAMES }),
      setShowExplorer: (showExplorer: boolean) => set({ showExplorer }),
      setTaskDetail: (taskDetail: TaskDetail) => set({ taskDetail }),
      autoCommitGitWorktree: true,
      enableTaskCompleteBeep: true,
      preventSleepDuringTasks: true,
      enabledQuoteCategories: [
        'economics',
        'gfw',
        'history',
        'interest',
        'life',
        'management',
        'politics',
        'programming',
      ],
      setAutoCommitGitWorktree: (enabled: boolean) => set({ autoCommitGitWorktree: enabled }),
      setEnableTaskCompleteBeep: (enabled: boolean) => set({ enableTaskCompleteBeep: enabled }),
      setPreventSleepDuringTasks: (enabled: boolean) => set({ preventSleepDuringTasks: enabled }),
      setEnabledQuoteCategories: (categories: string[]) =>
        set({ enabledQuoteCategories: categories }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
