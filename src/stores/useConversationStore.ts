import { create } from "zustand";
import type { CodexEvent } from "@/types/chat";
import { DELTA_EVENT_TYPES } from "@/types/chat";
import { v4 } from "uuid";

const DEDUPE_EXEMPT_TYPES = new Set<CodexEvent["payload"]["params"]["msg"]["type"]>([
  "user_message",
]);

type HydrationStatus = "idle" | "loading" | "ready" | "error";

interface HydrationEntry {
  status: HydrationStatus;
  error?: string;
  lastUpdated?: number;
}

function shouldSkipDuplicate(
  previous: CodexEvent,
  incoming: CodexEvent,
): boolean {
  if (DEDUPE_EXEMPT_TYPES.has(incoming.payload.params.msg.type)) {
    return false;
  }
  if (previous.payload.params.msg.type !== incoming.payload.params.msg.type) {
    return false;
  }
  return JSON.stringify(previous.payload.params.msg) === JSON.stringify(incoming.payload.params.msg);
}

interface ConversationState {
  eventsByConversation: Record<string, CodexEvent[]>;
  hydrationByConversation: Record<string, HydrationEntry>;
  currentMessage: string;
}

interface ConversationActions {
  setCurrentMessage: (value: string) => void;
  appendEvent: (conversationId: string, event: CodexEvent) => void;
  replaceEvents: (conversationId: string, events: CodexEvent[]) => void;
  clearConversation: (conversationId: string) => void;
  applyInitialHistory: (conversationId: string, messages: CodexEvent["payload"]["params"]["msg"][]) => void;
  setHydrationStatus: (
    conversationId: string,
    status: HydrationStatus,
    error?: string,
  ) => void;
  reset: () => void;
}

const normalizeEvent = (
  event: CodexEvent,
  source: "live" | "history",
  createdAt?: number,
): CodexEvent => {
  return {
    ...event,
    createdAt: createdAt ?? event.createdAt ?? Date.now(),
    source: event.source ?? source,
  };
};

const normalizeInitialMessages = (
  messages: CodexEvent["payload"]["params"]["msg"][],
): CodexEvent[] => {
  const baseTimestamp = Date.now() - messages.length * 1000;
  const normalized: CodexEvent[] = [];
  messages.forEach((msg, index) => {
    if (!msg || typeof msg.type !== "string") {
      return;
    }
    const createdAt = baseTimestamp + index * 1000;
    const id = createdAt
    const event: CodexEvent = normalizeEvent(
      {
        id: id,
        event: "codex/event",
        payload: {
          method: "",
          params: { conversationId: "", id: v4(), msg },
        },
        createdAt: createdAt,
        source: "history",
      },
      "history",
      createdAt,
    );
    const last = normalized[normalized.length - 1];
    if (last && shouldSkipDuplicate(last, event)) {
      return;
    }
    normalized.push(event);
  });
  return normalized;
};

export const useConversationStore = create<
  ConversationState & ConversationActions
>((set, _get) => ({
  eventsByConversation: {},
  hydrationByConversation: {},
  currentMessage: "",
  setCurrentMessage: (value) => set({ currentMessage: value }),
  setHydrationStatus: (conversationId, status, error) =>
    set((state) => ({
      hydrationByConversation: {
        ...state.hydrationByConversation,
        [conversationId]: {
          status,
          error,
          lastUpdated:
            status === "ready" ? Date.now() : state.hydrationByConversation[conversationId]?.lastUpdated,
        },
      },
    })),
  applyInitialHistory: (conversationId, messages) => {
    const normalized = normalizeInitialMessages(messages);
    set((state) => ({
      eventsByConversation: {
        ...state.eventsByConversation,
        [conversationId]: normalized,
      },
      hydrationByConversation: {
        ...state.hydrationByConversation,
        [conversationId]: {
          status: "ready",
          lastUpdated: Date.now(),
        },
      },
    }));
  },
  appendEvent: (conversationId, event) => {
    if (DELTA_EVENT_TYPES.has(event.payload.params.msg.type)) {
      return;
    }
    const normalized = normalizeEvent(event, "live");
    set((state) => {
      const existing = state.eventsByConversation[conversationId] ?? [];

      if (existing.some((item) => item.id === normalized.id)) {
        return state;
      }

      const lastEvent = existing[existing.length - 1];
      if (lastEvent && shouldSkipDuplicate(lastEvent, normalized)) {
        return state;
      }

      return {
        eventsByConversation: {
          ...state.eventsByConversation,
          [conversationId]: [...existing, normalized],
        },
      };
    });
  },
  replaceEvents: (conversationId, events) =>
    set((state) => {
      const filtered: CodexEvent[] = [];
      for (const event of events) {
        if (DELTA_EVENT_TYPES.has(event.payload.params.msg.type)) {
          continue;
        }
        const normalized = normalizeEvent(event, event.source ?? "live");
        const previous = filtered[filtered.length - 1];
        if (previous && shouldSkipDuplicate(previous, normalized)) {
          continue;
        }
        if (filtered.some((item) => item.id === normalized.id)) {
          continue;
        }
        filtered.push(normalized);
      }

      return {
        eventsByConversation: {
          ...state.eventsByConversation,
          [conversationId]: filtered,
        },
      };
    }),
  clearConversation: (conversationId) =>
    set((state) => {
      const updatedEvents = { ...state.eventsByConversation };
      delete updatedEvents[conversationId];
      const updatedHydration = { ...state.hydrationByConversation };
      delete updatedHydration[conversationId];
      return {
        eventsByConversation: updatedEvents,
        hydrationByConversation: updatedHydration,
      };
    }),
  reset: () =>
    set({
      eventsByConversation: {},
      hydrationByConversation: {},
      currentMessage: "",
    }),
}));
