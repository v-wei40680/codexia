import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileChange } from "@/bindings/FileChange";

export interface PatchHistoryEntry {
  callId: string;
  autoApproved?: boolean;
  changes: Record<string, FileChange | null>;
  startedAt: number;
  completedAt?: number;
  success?: boolean;
  stdout?: string;
  stderr?: string;
}

interface PatchHistoryState {
  records: Record<string, PatchHistoryEntry[]>;
  registerBegin: (
    conversationId: string,
    payload: {
      callId: string;
      autoApproved?: boolean;
      changes?: Record<string, FileChange | null>;
    },
  ) => void;
  registerEnd: (
    conversationId: string,
    payload: {
      callId: string;
      success: boolean;
      stdout: string;
      stderr: string;
    },
  ) => void;
  clearConversation: (conversationId: string) => void;
}

const MAX_HISTORY_ENTRIES = 20;

export const usePatchHistoryStore = create<PatchHistoryState>()(
  persist(
    (set) => ({
      records: {},
      registerBegin: (conversationId, payload) =>
        set((state) => {
          if (!conversationId) return state;
          const history = state.records[conversationId] ?? [];
          const existingIndex = history.findIndex(
            (entry) => entry.callId === payload.callId,
          );
          const baseEntry: PatchHistoryEntry = {
            callId: payload.callId,
            autoApproved: payload.autoApproved,
            changes: payload.changes ? { ...payload.changes } : {},
            startedAt: Date.now(),
          };

          let nextHistory: PatchHistoryEntry[];
          if (existingIndex >= 0) {
            const existing = history[existingIndex];
            nextHistory = [...history];
            nextHistory[existingIndex] = {
              ...existing,
              ...baseEntry,
            };
          } else {
            nextHistory = [...history, baseEntry];
          }

          if (nextHistory.length > MAX_HISTORY_ENTRIES) {
            nextHistory = nextHistory.slice(-MAX_HISTORY_ENTRIES);
          }

          return {
            records: {
              ...state.records,
              [conversationId]: nextHistory,
            },
          };
        }),
      registerEnd: (conversationId, payload) =>
        set((state) => {
          if (!conversationId) return state;
          const history = state.records[conversationId] ?? [];
          const existingIndex = history.findIndex(
            (entry) => entry.callId === payload.callId,
          );
          const completionDetails = {
            success: payload.success,
            stdout: payload.stdout,
            stderr: payload.stderr,
            completedAt: Date.now(),
          };

          let nextHistory: PatchHistoryEntry[];
          if (existingIndex >= 0) {
            nextHistory = [...history];
            nextHistory[existingIndex] = {
              ...history[existingIndex],
              ...completionDetails,
            };
          } else {
            nextHistory = [
              ...history,
              {
                callId: payload.callId,
                changes: {},
                startedAt: Date.now(),
                ...completionDetails,
              },
            ];
          }

          if (nextHistory.length > MAX_HISTORY_ENTRIES) {
            nextHistory = nextHistory.slice(-MAX_HISTORY_ENTRIES);
          }

          return {
            records: {
              ...state.records,
              [conversationId]: nextHistory,
            },
          };
        }),
      clearConversation: (conversationId) =>
        set((state) => {
          if (!conversationId || !state.records[conversationId]) {
            return state;
          }
          const { [conversationId]: _removed, ...rest } = state.records;
          return {
            records: rest,
          };
        }),
    }),
    {
      name: "patch-history-store",
    },
  ),
);
