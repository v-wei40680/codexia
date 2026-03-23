import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TaskDetail = 'steps' | 'stepsWithCommand' | 'stepsWithOutput';
export type TaskCompleteBeepMode = 'never' | 'unfocused' | 'always';

export interface SettingState {
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
  showReasoning: boolean;
  setShowReasoning: (enabled: boolean) => void;
  enabledQuoteCategories: string[];
  setEnabledQuoteCategories: (categories: string[]) => void;
  showSidebarMarketplace: boolean;
  setShowSidebarMarketplace: (show: boolean) => void;
  showHeaderTerminalButton: boolean;
  setShowHeaderTerminalButton: (show: boolean) => void;
  showHeaderWebPreviewButton: boolean;
  setShowHeaderWebPreviewButton: (show: boolean) => void;
  showHeaderNotesButton: boolean;
  setShowHeaderNotesButton: (show: boolean) => void;
  showHeaderFilesButton: boolean;
  setShowHeaderFilesButton: (show: boolean) => void;
  showHeaderDiffButton: boolean;
  setShowHeaderDiffButton: (show: boolean) => void;
  showQuotes: boolean;
  setShowQuotes: (show: boolean) => void;
  showTips: boolean;
  setShowTips: (show: boolean) => void;
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;
  analyticsConsentShown: boolean;
  setAnalyticsConsentShown: (shown: boolean) => void;
  customStunServers: string[];
  setCustomStunServers: (servers: string[]) => void;
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
      showReasoning: true,
      enabledQuoteCategories: [
        'economics',
        'interest',
        'life',
        'management',
        'programming',
      ],
      setAutoCommitGitWorktree: (enabled: boolean) => set({ autoCommitGitWorktree: enabled }),
      setEnableTaskCompleteBeep: (mode: TaskCompleteBeepMode) =>
        set({ enableTaskCompleteBeep: mode }),
      setPreventSleepDuringTasks: (enabled: boolean) => set({ preventSleepDuringTasks: enabled }),
      setShowReasoning: (enabled: boolean) => set({ showReasoning: enabled }),
      setEnabledQuoteCategories: (categories: string[]) =>
        set({ enabledQuoteCategories: categories }),
      showSidebarMarketplace: true,
      setShowSidebarMarketplace: (show: boolean) => set({ showSidebarMarketplace: show }),
      showHeaderTerminalButton: true,
      setShowHeaderTerminalButton: (show: boolean) => set({ showHeaderTerminalButton: show }),
      showHeaderWebPreviewButton: true,
      setShowHeaderWebPreviewButton: (show: boolean) => set({ showHeaderWebPreviewButton: show }),
      showHeaderNotesButton: true,
      setShowHeaderNotesButton: (show: boolean) => set({ showHeaderNotesButton: show }),
      showHeaderFilesButton: true,
      setShowHeaderFilesButton: (show: boolean) => set({ showHeaderFilesButton: show }),
      showHeaderDiffButton: true,
      setShowHeaderDiffButton: (show: boolean) => set({ showHeaderDiffButton: show }),
      showQuotes: false,
      setShowQuotes: (show: boolean) => set({ showQuotes: show }),
      showTips: false,
      setShowTips: (show: boolean) => set({ showTips: show }),
      analyticsEnabled: false,
      setAnalyticsEnabled: (enabled: boolean) => set({ analyticsEnabled: enabled }),
      analyticsConsentShown: false,
      setAnalyticsConsentShown: (shown: boolean) => set({ analyticsConsentShown: shown }),
      customStunServers: [],
      setCustomStunServers: (servers: string[]) => set({ customStunServers: servers }),
    }),
    {
      name: 'settings-storage',
      version: 4,
      migrate: (persistedState, version) => {
        if (!persistedState) {
          return persistedState;
        }

        let nextState = persistedState as Record<string, unknown>;

        if (version < 2) {
          const state = nextState as LegacySettingState & Record<string, unknown>;
          if (typeof state.enableTaskCompleteBeep === 'boolean') {
            nextState = {
              ...state,
              enableTaskCompleteBeep: state.enableTaskCompleteBeep ? 'always' : 'never',
            };
          }
        }

        if (version < 4) {
          return {
            ...nextState,
            showQuotes: typeof nextState.showQuotes === 'boolean' ? nextState.showQuotes : true,
            showTips: typeof nextState.showTips === 'boolean' ? nextState.showTips : true,
          };
        }

        return nextState;
      },
    }
  )
);
