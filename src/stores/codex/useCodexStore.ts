import { create } from 'zustand';
import type { ServerNotification } from '@/bindings';
import type { ThreadListItem } from '@/types/codex/ThreadListItem';

interface CodexStore {
  // State
  threads: ThreadListItem[];
  currentThreadId: string | null;
  currentTurnId: string | null;
  events: Record<string, ServerNotification[]>; // Events per thread
  activeThreadIds: string[]; // Track resumed/active threads
  inputFocusTrigger: number; // Increment to trigger focus in InputArea
  threadListRefreshToken: number; // Increment to trigger thread list refresh
  threadListNextCursor: string | null;

  // Basic Setters
  setThreads: (threads: ThreadListItem[]) => void;
  appendThreads: (threads: ThreadListItem[]) => void;
  setThreadListNextCursor: (cursor: string | null) => void;
  addEvent: (threadId: string, event: ServerNotification) => void;
  triggerInputFocus: () => void;
  triggerThreadListRefresh: () => void;
}

export const useCodexStore = create<CodexStore>((set) => ({
  threads: [],
  currentThreadId: null,
  currentTurnId: null,
  events: {},
  activeThreadIds: [],
  inputFocusTrigger: 0,
  threadListRefreshToken: 0,
  threadListNextCursor: null,

  setThreads: (threads: ThreadListItem[]) => {
    set({ threads });
  },

  appendThreads: (threads: ThreadListItem[]) => {
    set((state) => {
      if (threads.length === 0) {
        return {};
      }
      const seen = new Set(state.threads.map((thread) => thread.id));
      const merged = [...state.threads];
      for (const thread of threads) {
        if (!seen.has(thread.id)) {
          seen.add(thread.id);
          merged.push(thread);
        }
      }
      return { threads: merged };
    });
  },

  setThreadListNextCursor: (cursor: string | null) => {
    set({ threadListNextCursor: cursor });
  },

  addEvent: (threadId: string, event: ServerNotification) => {
    set((state) => {
      const existingEvents = state.events[threadId] || [];

      // Deduplicate turn/diff/updated events
      // If this is a turn/diff/updated event, remove previous ones with the same turnId
      let filteredEvents = existingEvents;
      if (event.method === 'turn/diff/updated') {
        const newTurnId = (event.params as any)?.turnId;
        filteredEvents = existingEvents.filter((e) => {
          if (e.method !== 'turn/diff/updated') return true;
          const existingTurnId = (e.params as any)?.turnId;
          return existingTurnId !== newTurnId;
        });
      }

      const newEvents = {
        ...state.events,
        [threadId]: [...filteredEvents, event],
      };

      return {
        events: newEvents,
      };
    });
  },

  triggerInputFocus: () => {
    set((state) => ({ inputFocusTrigger: state.inputFocusTrigger + 1 }));
  },

  triggerThreadListRefresh: () => {
    set((state) => ({ threadListRefreshToken: state.threadListRefreshToken + 1 }));
  },
}));

export const useCurrentThread = () =>
  useCodexStore(
    (state) => state.threads.find((thread) => thread.id === state.currentThreadId) ?? null
  );
