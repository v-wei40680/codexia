import { create } from "zustand";
import type { ConversationEvent, EventWithId } from "@/types/chat";
import { DELTA_EVENT_TYPES } from "@/types/chat";

const DEDUPE_EXEMPT_TYPES = new Set<EventWithId["msg"]["type"]>([
  "user_message",
]);

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
  currentMessage: string;
}

interface ConversationActions {
  setCurrentMessage: (value: string) => void;
  appendEvent: (conversationId: string, event: EventWithId) => void;
  replaceEvents: (conversationId: string, events: ConversationEvent[]) => void;
  clearConversation: (conversationId: string) => void;
  reset: () => void;
}

export const useConversationStore = create<
  ConversationState & ConversationActions
>((set) => ({
  eventsByConversation: {},
  currentMessage: "",
  setCurrentMessage: (value) => set({ currentMessage: value }),
  appendEvent: (conversationId, event) => {
    if (DELTA_EVENT_TYPES.has(event.msg.type)) {
      return;
    }
    set((state) => {
      const existing = state.eventsByConversation[conversationId] ?? [];
      const lastEvent = existing[existing.length - 1];
      if (lastEvent && shouldSkipDuplicate(lastEvent, event)) {
        return state;
      }

      return {
        eventsByConversation: {
          ...state.eventsByConversation,
          [conversationId]: [...existing, event],
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
        const previous = filtered[filtered.length - 1];
        if (previous && shouldSkipDuplicate(previous, event)) {
          continue;
        }
        filtered.push(event);
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
      const updated = { ...state.eventsByConversation };
      delete updated[conversationId];
      return { eventsByConversation: updated };
    }),
  reset: () => set({ eventsByConversation: {}, currentMessage: "" }),
}));
