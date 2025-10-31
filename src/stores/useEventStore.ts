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
      const updatedEvents = [...currentEvents, event].sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      );

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
