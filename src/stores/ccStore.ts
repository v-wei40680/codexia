import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CCMessage } from '@/types/cc/cc-messages';
import type { CCMcpServers } from '@/types/cc/cc-mcp';

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';
export type ModelType = 'sonnet' | 'haiku' | 'opus';

// Re-export message types for convenience
export type { CCMessage } from '@/types/cc/cc-messages';

export interface CCPluginConfig {
  path: string;
  name?: string;
}

export interface CCOptions {
  model?: ModelType;
  permissionMode: PermissionMode;
  maxTurns?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  maxThinkingTokens?: number;
  fallbackModel?: string;
  maxBudgetUsd?: number;
  plugins?: CCPluginConfig[];
  // Note: enabledSkills removed - skills are auto-discovered by Claude Code CLI
  // from ~/.claude/skills/ and cannot be filtered per-session
  mcpServers?: CCMcpServers;
}

interface CCStoreState {
  activeSessionId: string | null;
  activeSessionIds: string[];
  messages: CCMessage[];
  options: CCOptions;
  isConnected: boolean;
  isLoading: boolean;
  showExamples: boolean;
  showFooter: boolean;
  isViewingHistory: boolean; // true when viewing history, false when actively working

  setActiveSessionId: (id: string | null) => void;
  addActiveSessionId: (id: string) => void;
  removeActiveSessionId: (id: string) => void;
  addMessage: (message: CCMessage) => void;
  setMessages: (messages: CCMessage[]) => void;
  updateOptions: (options: Partial<CCOptions>) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setShowExamples: (show: boolean) => void;
  setShowFooter: (show: boolean) => void;
  setViewingHistory: (viewing: boolean) => void;
  clearMessages: () => void;
}

export const useCCStore = create<CCStoreState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      activeSessionIds: [],
      messages: [],
      options: {
        model: undefined,
        permissionMode: 'default',
      },
      isConnected: false,
      isLoading: false,
      showExamples: true,
      showFooter: true,
      isViewingHistory: false,

      setActiveSessionId: (id) =>
        set((state) => {
          const newIds =
            id && !state.activeSessionIds.includes(id)
              ? [...state.activeSessionIds, id]
              : state.activeSessionIds;
          return { activeSessionId: id, activeSessionIds: newIds };
        }),
      addActiveSessionId: (id) =>
        set((state) => ({
          activeSessionIds: state.activeSessionIds.includes(id)
            ? state.activeSessionIds
            : [...state.activeSessionIds, id],
        })),
      removeActiveSessionId: (id) =>
        set((state) => ({
          activeSessionIds: state.activeSessionIds.filter((sid) => sid !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        })),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      updateOptions: (newOptions) =>
        set((state) => ({
          options: { ...state.options, ...newOptions },
        })),
      setConnected: (connected) => set({ isConnected: connected }),
      setLoading: (loading) => set({ isLoading: loading }),
      setShowExamples: (show) => set({ showExamples: show }),
      setShowFooter: (show) => set({ showFooter: show }),
      setViewingHistory: (viewing) => set({ isViewingHistory: viewing }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'cc-store',
      version: 2,
      partialize: (state) => ({
        options: state.options,
        showFooter: state.showFooter,
      }),
    }
  )
);
