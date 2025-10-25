import { create } from "zustand";
import type { ConversationEvent, EventWithId } from "@/types/chat";
import { DELTA_EVENT_TYPES } from "@/types/chat";

const DEDUPE_EXEMPT_TYPES = new Set<EventWithId["msg"]["type"]>([
  "user_message",
]);

type HydrationStatus = "idle" | "loading" | "ready" | "error";

interface HydrationEntry {
  status: HydrationStatus;
  error?: string;
  lastUpdated?: number;
}

function shouldSkipDuplicate(
  previous: ConversationEvent,
  incoming: ConversationEvent,
): boolean {
  if (DEDUPE_EXEMPT_TYPES.has(incoming.msg.type)) {
    return false;
  }
  if (previous.msg.type !== incoming.msg.type) {
    return false;
  }
  return JSON.stringify(previous.msg) === JSON.stringify(incoming.msg);
}

interface ConversationState {
  eventsByConversation: Record<string, ConversationEvent[]>;
  hydrationByConversation: Record<string, HydrationEntry>;
  currentMessage: string;
}

interface ConversationActions {
  setCurrentMessage: (value: string) => void;
  appendEvent: (conversationId: string, event: EventWithId) => void;
  replaceEvents: (conversationId: string, events: ConversationEvent[]) => void;
  clearConversation: (conversationId: string) => void;
  applyInitialHistory: (conversationId: string, messages: EventWithId["msg"][]) => void;
  setHydrationStatus: (
    conversationId: string,
    status: HydrationStatus,
    error?: string,
  ) => void;
  reset: () => void;
}

const generateEventId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const normalizeEvent = (
  event: EventWithId,
  source: "live" | "history",
  createdAt?: number,
): ConversationEvent => {
  return {
    ...event,
    createdAt: createdAt ?? event.createdAt ?? Date.now(),
    source: event.source ?? source,
  };
};

const normalizeInitialMessages = (
  messages: EventWithId["msg"][],
): ConversationEvent[] => {
  const baseTimestamp = Date.now() - messages.length * 1000;
  const normalized: ConversationEvent[] = [];
  messages.forEach((msg, index) => {
    if (!msg || typeof msg.type !== "string") {
      return;
    }
    const eventId = generateEventId(`history-${msg.type.toLowerCase()}`);
    const createdAt = baseTimestamp + index * 1000;
    const event = normalizeEvent(
      { id: eventId, msg },
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
    if (DELTA_EVENT_TYPES.has(event.msg.type)) {
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
      const filtered: ConversationEvent[] = [];
      for (const event of events) {
        if (DELTA_EVENT_TYPES.has(event.msg.type)) {
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
