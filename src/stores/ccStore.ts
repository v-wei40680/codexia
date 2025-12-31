import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PermissionMode = "default" | "acceptEdits" | "plan" | "bypassPermissions";
export type ModelType = "sonnet" | "haiku" | "opus";

// SDK Message types
export interface CCContentBlock {
  type: "text" | "thinking" | "tool_use" | "tool_result";
  text?: string;
  thinking?: string;
  signature?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
  content?: any;
  is_error?: boolean;
}

export interface CCAssistantMessage {
  type: "assistant";
  message: {
    content: CCContentBlock[];
    model?: string;
    id?: string;
    stop_reason?: string;
  };
  session_id?: string;
}

export interface CCSystemMessage {
  type: "system";
  subtype: string;
  cwd?: string;
  session_id?: string;
  tools?: string[];
  mcp_servers?: any[];
  model?: string;
  permission_mode?: string;
}

export interface CCResultMessage {
  type: "result";
  subtype: string;
  duration_ms: number;
  duration_api_ms: number;
  is_error: boolean;
  num_turns: number;
  session_id: string;
  total_cost_usd?: number;
  usage?: any;
  result?: string;
}

export interface CCUserMessage {
  type: "user";
  text?: string;
  content?: CCContentBlock[];
}

export interface CCStreamEvent {
  type: "stream_event";
  uuid: string;
  session_id: string;
  event: any;
}

export type CCMessage =
  | CCAssistantMessage
  | CCSystemMessage
  | CCResultMessage
  | CCUserMessage
  | CCStreamEvent;

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
