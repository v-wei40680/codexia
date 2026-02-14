import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskDetail = 'steps' | 'stepsWithCommand' | 'stepsWithOutput';
export type TaskCompleteBeepMode = 'never' | 'unfocused' | 'always';

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
  enableTaskCompleteBeep: TaskCompleteBeepMode;
  setEnableTaskCompleteBeep: (mode: TaskCompleteBeepMode) => void;
  preventSleepDuringTasks: boolean;
  setPreventSleepDuringTasks: (enabled: boolean) => void;
  enabledQuoteCategories: string[];
  setEnabledQuoteCategories: (categories: string[]) => void;
}

type LegacySettingState = {
  enableTaskCompleteBeep?: boolean | TaskCompleteBeepMode;
};

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
      enableTaskCompleteBeep: 'always',
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
      setEnableTaskCompleteBeep: (mode: TaskCompleteBeepMode) =>
        set({ enableTaskCompleteBeep: mode }),
      setPreventSleepDuringTasks: (enabled: boolean) => set({ preventSleepDuringTasks: enabled }),
      setEnabledQuoteCategories: (categories: string[]) =>
        set({ enabledQuoteCategories: categories }),
    }),
    {
      name: 'settings-storage',
      version: 3,
      migrate: (persistedState, version) => {
        if (!persistedState) {
          return persistedState;
        }

        if (version < 2) {
          const state = persistedState as LegacySettingState & Record<string, unknown>;
          if (typeof state.enableTaskCompleteBeep === 'boolean') {
            return {
              ...state,
              enableTaskCompleteBeep: state.enableTaskCompleteBeep ? 'always' : 'never',
            };
          }
        }

        return persistedState;
      },
    }
  )
);
