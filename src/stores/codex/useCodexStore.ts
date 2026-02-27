import { create } from 'zustand';
import type { ServerNotification } from '@/bindings';
import type { ThreadListItem } from '@/types/codex/ThreadListItem';

type DeltaMethod =
  | 'item/agentMessage/delta'
  | 'item/plan/delta'
  | 'item/reasoning/textDelta'
  | 'item/reasoning/summaryTextDelta';

type DeltaEvent = Extract<ServerNotification, { method: DeltaMethod }>;

const isDeltaEvent = (event: ServerNotification): event is DeltaEvent =>
  event.method === 'item/agentMessage/delta' ||
  event.method === 'item/plan/delta' ||
  event.method === 'item/reasoning/textDelta' ||
  event.method === 'item/reasoning/summaryTextDelta';

const canCompactDeltaEvents = (previous: DeltaEvent, incoming: DeltaEvent): boolean => {
  if (previous.method !== incoming.method) {
    return false;
  }

  switch (incoming.method) {
    case 'item/agentMessage/delta':
    case 'item/plan/delta':
      return (
        previous.params.threadId === incoming.params.threadId &&
        previous.params.turnId === incoming.params.turnId &&
        previous.params.itemId === incoming.params.itemId
      );
    case 'item/reasoning/textDelta':
      const previousReasoning = previous as Extract<DeltaEvent, { method: 'item/reasoning/textDelta' }>;
      const incomingReasoning = incoming as Extract<DeltaEvent, { method: 'item/reasoning/textDelta' }>;
      return (
        previousReasoning.params.threadId === incomingReasoning.params.threadId &&
        previousReasoning.params.turnId === incomingReasoning.params.turnId &&
        previousReasoning.params.itemId === incomingReasoning.params.itemId &&
        previousReasoning.params.contentIndex === incomingReasoning.params.contentIndex
      );
    case 'item/reasoning/summaryTextDelta':
      const previousSummary = previous as Extract<
        DeltaEvent,
        { method: 'item/reasoning/summaryTextDelta' }
      >;
      const incomingSummary = incoming as Extract<
        DeltaEvent,
        { method: 'item/reasoning/summaryTextDelta' }
      >;
      return (
        previousSummary.params.threadId === incomingSummary.params.threadId &&
        previousSummary.params.turnId === incomingSummary.params.turnId &&
        previousSummary.params.itemId === incomingSummary.params.itemId &&
        previousSummary.params.summaryIndex === incomingSummary.params.summaryIndex
      );
    default:
      return true;
  }
};

const compactDeltaEvents = (
  events: ServerNotification[],
  incoming: ServerNotification
): ServerNotification[] => {
  const previous = events[events.length - 1];
  if (!previous || !isDeltaEvent(previous) || !isDeltaEvent(incoming)) {
    return [...events, incoming];
  }

  if (!canCompactDeltaEvents(previous, incoming)) {
    return [...events, incoming];
  }

  const compacted = {
    ...incoming,
    params: {
      ...incoming.params,
      delta: `${previous.params.delta}${incoming.params.delta}`,
    },
  } as ServerNotification;

  return [...events.slice(0, -1), compacted];
};

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

      const compactedEvents = compactDeltaEvents(filteredEvents, event);

      const newEvents = {
        ...state.events,
        [threadId]: compactedEvents,
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
