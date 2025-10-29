
import { create } from "zustand";
import { CodexEvent } from "@/types/chat";

interface EventState {
  events: Record<string, CodexEvent[]>;
  addEvent: (conversationId: string, event: CodexEvent) => void;
  setEvents: (conversationId: string, newEvents: CodexEvent[]) => void;
  clearEvents: (conversationId: string) => void;
}

export const useEventStore = create<EventState>((set) => ({
  events: {},
  addEvent: (conversationId, event) =>
    set((state) => {
      const currentEvents = state.events[conversationId] || [];
      const key = getEventKey(event);
      const index = currentEvents.findIndex((e) => getEventKey(e) === key);

      let updatedEvents: CodexEvent[];
      if (index === -1) {
        updatedEvents = [...currentEvents, event];
      } else {
        updatedEvents = [...currentEvents];
        updatedEvents[index] = event;
      }
      updatedEvents.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

      return {
        events: {
          ...state.events,
          [conversationId]: updatedEvents,
        },
      };
    }),
  setEvents: (conversationId, newEvents) =>
    set((state) => ({
      events: {
        ...state.events,
        [conversationId]: newEvents,
      },
    })),
  clearEvents: (conversationId) =>
    set((state) => {
      const newEvents = { ...state.events };
      delete newEvents[conversationId];
      return { events: newEvents };
    }),
}));

const STREAM_TYPE_NORMALIZATION: Record<string, string> = {
  agent_message_delta: "agent_message",
  agent_reasoning_delta: "agent_reasoning",
  agent_reasoning_raw_content_delta: "agent_reasoning_raw_content",
};

const getEventKey = (event: CodexEvent) => {
  const {
    params: { id, msg },
  } = event.payload;
  const normalizedType = STREAM_TYPE_NORMALIZATION[msg.type] ?? msg.type;
  return `${id}:${normalizedType}`;
};
