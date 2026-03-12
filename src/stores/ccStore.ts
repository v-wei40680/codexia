import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CCMessage } from '@/components/cc/types/messages';
import type { CCMcpServers } from '@/types/cc/cc-mcp';

export type PermissionMode = 'default' | 'acceptEdits' | 'plan' | 'bypassPermissions';
export type ModelType = 'sonnet' | 'haiku' | 'opus';

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
  sessionMessagesMap: Record<string, CCMessage[]>;
  options: CCOptions;
  isConnected: boolean;
  isLoading: boolean;
  showExamples: boolean;
  /** Slash commands available in the current session (populated from System::init) */
  slashCommands: string[];

  setActiveSessionId: (id: string | null) => void;
  addActiveSessionId: (id: string) => void;
  removeActiveSessionId: (id: string) => void;
  switchToSession: (id: string) => void;
  saveCurrentSessionMessages: () => void;
  addMessage: (message: CCMessage) => void;
  updateMessage: (index: number, message: Partial<CCMessage>) => void;
  setMessages: (messages: CCMessage[]) => void;
  updateOptions: (options: Partial<CCOptions>) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setShowExamples: (show: boolean) => void;
  clearMessages: () => void;
  setSlashCommands: (commands: string[]) => void;
}

export const useCCStore = create<CCStoreState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      activeSessionIds: [],
      messages: [],
      sessionMessagesMap: {},
      options: {
        model: undefined,
        permissionMode: 'default',
      },
      isConnected: false,
      isLoading: false,
      showExamples: true,
      slashCommands: [],

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
      // Save current session's messages to the map, then switch to target session and restore its messages
      switchToSession: (id) =>
        set((state) => {
          const updatedMap = { ...state.sessionMessagesMap };
          // Persist current session messages before switching
          if (state.activeSessionId) {
            updatedMap[state.activeSessionId] = state.messages;
          }
          const restoredMessages = updatedMap[id] ?? [];
          return {
            activeSessionId: id,
            sessionMessagesMap: updatedMap,
            messages: restoredMessages,
            isLoading: false,
            isConnected: true,
          };
        }),
      // Persist current session messages to map without switching
      saveCurrentSessionMessages: () =>
        set((state) => {
          if (!state.activeSessionId) return {};
          return {
            sessionMessagesMap: {
              ...state.sessionMessagesMap,
              [state.activeSessionId]: state.messages,
            },
          };
        }),
      addMessage: (message) =>
        set((state) => {
          const newMessages = [...state.messages, message];
          const updatedMap = state.activeSessionId
            ? { ...state.sessionMessagesMap, [state.activeSessionId]: newMessages }
            : state.sessionMessagesMap;
          return { messages: newMessages, sessionMessagesMap: updatedMap };
        }),
      updateMessage: (index, message) =>
        set((state) => ({
          messages: state.messages.map((m, i) =>
            i === index ? { ...m, ...message } as CCMessage : m
          ),
        })),
      setMessages: (messages) => set({ messages }),
      updateOptions: (newOptions) =>
        set((state) => ({
          options: { ...state.options, ...newOptions },
        })),
      setConnected: (connected) => set({ isConnected: connected }),
      setLoading: (loading) => set({ isLoading: loading }),
      setShowExamples: (show) => set({ showExamples: show }),
      clearMessages: () => set({ messages: [] }),
      setSlashCommands: (commands) => set({ slashCommands: commands }),
    }),
    {
      name: 'cc-store',
      version: 2,
      partialize: (state) => ({
        options: state.options,
        slashCommands: state.slashCommands,
      }),
    }
  )
);
