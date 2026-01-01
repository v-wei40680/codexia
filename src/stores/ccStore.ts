import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CCMessage } from "@/types/cc-messages";

export type PermissionMode = "default" | "acceptEdits" | "plan" | "bypassPermissions";
export type ModelType = "sonnet" | "haiku" | "opus";

// Re-export message types for convenience
export type { CCMessage } from "@/types/cc-messages";

export interface CCPluginConfig {
  path: string;
  name?: string;
}

export interface CCOptions {
  model: ModelType;
  permissionMode: PermissionMode;
  maxTurns?: number;
  allowedTools?: string[];
  disallowedTools?: string[];
  maxThinkingTokens?: number;
  fallbackModel?: string;
  maxBudgetUsd?: number;
  plugins?: CCPluginConfig[];
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
  clearMessages: () => void;
}

export const useCCStore = create<CCStoreState>()(
  persist(
    (set) => ({
      activeSessionId: null,
      activeSessionIds: [],
      messages: [],
      options: {
        model: "sonnet",
        permissionMode: "default",
      },
      isConnected: false,
      isLoading: false,
      showExamples: true,
      showFooter: true,

      setActiveSessionId: (id) => set((state) => {
        const newIds = id && !state.activeSessionIds.includes(id)
          ? [...state.activeSessionIds, id]
          : state.activeSessionIds;
        return { activeSessionId: id, activeSessionIds: newIds };
      }),
      addActiveSessionId: (id) => set((state) => ({
        activeSessionIds: state.activeSessionIds.includes(id)
          ? state.activeSessionIds
          : [...state.activeSessionIds, id]
      })),
      removeActiveSessionId: (id) => set((state) => ({
        activeSessionIds: state.activeSessionIds.filter(sid => sid !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
      })),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      updateOptions: (newOptions) =>
        set((state) => ({
          options: { ...state.options, ...newOptions },
        })),
      setConnected: (connected) => set({ isConnected: connected }),
      setLoading: (loading) => set({ isLoading: loading }),
      setShowExamples: (show) => set({ showExamples: show }),
      setShowFooter: (show) => set({ showFooter: show }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: "cc-store",
      partialize: (state) => ({
        options: state.options,
        showFooter: state.showFooter,
      }),
    }
  )
);
