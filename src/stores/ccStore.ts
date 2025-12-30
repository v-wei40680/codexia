import { create } from "zustand";

export type PermissionMode = "default" | "acceptEdits" | "plan" | "bypassPermissions";
export type ModelType = "sonnet" | "haiku" | "opus";

export interface CCMessage {
  role: "user" | "assistant";
  content: string;
}

interface CCStoreState {
  activeSessionId: string | null;
  messages: CCMessage[];
  model: ModelType;
  permissionMode: PermissionMode;
  resumedIds: Set<string>;
  isConnected: boolean;
  isHistoryMode: boolean;

  setActiveSessionId: (id: string | null) => void;
  addMessage: (message: CCMessage) => void;
  setMessages: (messages: CCMessage[]) => void;
  setModel: (model: ModelType) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  addResumedId: (id: string) => void;
  hasResumedId: (id: string) => boolean;
  setConnected: (connected: boolean) => void;
  clearMessages: () => void;
  setHistoryMode: (enabled: boolean) => void;
}

export const useCCStore = create<CCStoreState>((set, get) => ({
  activeSessionId: null,
  messages: [],
  model: "sonnet",
  permissionMode: "default",
  resumedIds: new Set(),
  isConnected: false,
  isHistoryMode: false,

  setActiveSessionId: (id) => set({ activeSessionId: id }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setModel: (model) => set({ model }),
  setPermissionMode: (mode) => set({ permissionMode: mode }),
  addResumedId: (id) => {
    const state = get();
    const newSet = new Set(state.resumedIds);
    newSet.add(id);
    set({ resumedIds: newSet });
  },
  hasResumedId: (id) => get().resumedIds.has(id),
  setConnected: (connected) => set({ isConnected: connected }),
  clearMessages: () => set({ messages: [] }),
  setHistoryMode: (enabled) => set({ isHistoryMode: enabled }),
}));
