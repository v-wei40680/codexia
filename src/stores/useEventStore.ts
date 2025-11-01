import { create } from "zustand";
import { CodexEvent } from "@/types/chat";
import type { EventMsg } from "@/bindings/EventMsg";

interface EventState {
  events: Record<string, CodexEvent[]>;
  addEvent: (conversationId: string, event: CodexEvent) => void;
  setEvents: (conversationId: string, newEvents: CodexEvent[]) => void;
  clearEvents: (conversationId: string) => void;
}

// Extended event type with stable ID for React keys
export type ExtendedCodexEvent = CodexEvent & {
  stableId?: string;
};

const isDeltaEvent = (type: string): boolean => {
  return type.endsWith("_delta");
};

const getBaseEventType = (deltaType: string): string => {
  return deltaType.replace("_delta", "");
};

const canMergeDelta = (existingEvent: CodexEvent, deltaEvent: CodexEvent): boolean => {
  const existingMsg = existingEvent.payload.params.msg;
  const deltaMsg = deltaEvent.payload.params.msg;
  
  if (!isDeltaEvent(deltaMsg.type)) return false;
  
  const baseType = getBaseEventType(deltaMsg.type);
  if (existingMsg.type !== baseType && existingMsg.type !== deltaMsg.type) {
    return false;
  }
  
  if ("item_id" in existingMsg && "item_id" in deltaMsg) {
    return existingMsg.item_id === deltaMsg.item_id;
  }
  
  if ("call_id" in existingMsg && "call_id" in deltaMsg) {
    return existingMsg.call_id === deltaMsg.call_id;
  }
  
  return true;
};

const mergeDeltaIntoEvent = (existingEvent: CodexEvent, deltaEvent: CodexEvent): CodexEvent => {
  const existingMsg = existingEvent.payload.params.msg;
  const deltaMsg = deltaEvent.payload.params.msg;

  if (!("delta" in deltaMsg) || typeof deltaMsg.delta !== "string") {
    return existingEvent;
  }

  const updateMsg = (msg: EventMsg): CodexEvent["payload"]["params"]["msg"] => ({
    ...msg,
  });

  let mergedMsg: EventMsg | null = null;

  switch (deltaMsg.type) {
    case "agent_message_delta": {
      const previousContent =
        existingMsg.type === "agent_message"
          ? existingMsg.message
          : existingMsg.type === "agent_message_delta"
            ? existingMsg.delta
            : "";

      const nextMsg: Extract<EventMsg, { type: "agent_message" }> = {
        type: "agent_message",
        message: `${previousContent}${deltaMsg.delta}`,
      };
      mergedMsg = nextMsg;
      break;
    }
    case "agent_reasoning_delta": {
      const previousContent =
        existingMsg.type === "agent_reasoning"
          ? existingMsg.text
          : existingMsg.type === "agent_reasoning_delta"
            ? existingMsg.delta
            : "";

      const nextMsg: Extract<EventMsg, { type: "agent_reasoning" }> = {
        type: "agent_reasoning",
        text: `${previousContent}${deltaMsg.delta}`,
      };
      mergedMsg = nextMsg;
      break;
    }
    case "agent_reasoning_raw_content_delta": {
      const previousContent =
        existingMsg.type === "agent_reasoning_raw_content"
          ? existingMsg.text
          : existingMsg.type === "agent_reasoning_raw_content_delta"
            ? existingMsg.delta
            : "";

      const nextMsg: Extract<EventMsg, { type: "agent_reasoning_raw_content" }> = {
        type: "agent_reasoning_raw_content",
        text: `${previousContent}${deltaMsg.delta}`,
      };
      mergedMsg = nextMsg;
      break;
    }
    case "agent_message_content_delta": {
      const previousContent =
        existingMsg.type === "agent_message_content_delta"
          ? existingMsg.delta
          : "";

      const nextMsg: Extract<EventMsg, { type: "agent_message_content_delta" }> = {
        type: "agent_message_content_delta",
        thread_id: deltaMsg.thread_id,
        turn_id: deltaMsg.turn_id,
        item_id: deltaMsg.item_id,
        delta: `${previousContent}${deltaMsg.delta}`,
      };
      mergedMsg = nextMsg;
      break;
    }
    case "reasoning_content_delta": {
      const previousContent =
        existingMsg.type === "reasoning_content_delta" ? existingMsg.delta : "";

      const nextMsg: Extract<EventMsg, { type: "reasoning_content_delta" }> = {
        type: "reasoning_content_delta",
        thread_id: deltaMsg.thread_id,
        turn_id: deltaMsg.turn_id,
        item_id: deltaMsg.item_id,
        delta: `${previousContent}${deltaMsg.delta}`,
      };
      mergedMsg = nextMsg;
      break;
    }
    case "reasoning_raw_content_delta": {
      const previousContent =
        existingMsg.type === "reasoning_raw_content_delta" ? existingMsg.delta : "";

      const nextMsg: Extract<EventMsg, { type: "reasoning_raw_content_delta" }> = {
        type: "reasoning_raw_content_delta",
        thread_id: deltaMsg.thread_id,
        turn_id: deltaMsg.turn_id,
        item_id: deltaMsg.item_id,
        delta: `${previousContent}${deltaMsg.delta}`,
      };
      mergedMsg = nextMsg;
      break;
    }
    default:
      mergedMsg = null;
  }

  if (!mergedMsg) {
    return existingEvent;
  }

  const finalMsg = updateMsg(mergedMsg);

  return {
    ...existingEvent,
    payload: {
      ...existingEvent.payload,
      params: {
        ...existingEvent.payload.params,
        msg: finalMsg,
      },
    },
  };
};

export const useEventStore = create<EventState>((set) => ({
  events: {},
  addEvent: (conversationId, event) =>
    set((state) => {
      const currentEvents = state.events[conversationId] || [];
      const eventMsg = event.payload.params.msg;
      
      if (isDeltaEvent(eventMsg.type)) {
        for (let i = currentEvents.length - 1; i >= 0; i--) {
          const existingEvent = currentEvents[i] as ExtendedCodexEvent;
          if (canMergeDelta(existingEvent, event)) {
            const mergedEvent = mergeDeltaIntoEvent(existingEvent, event);
            // Preserve the stable ID from the first event
            (mergedEvent as ExtendedCodexEvent).stableId = existingEvent.stableId;
            const updatedEvents = [
              ...currentEvents.slice(0, i),
              mergedEvent,
              ...currentEvents.slice(i + 1),
            ];
            return {
              events: {
                ...state.events,
                [conversationId]: updatedEvents,
              },
            };
          }
        }
      }
      
      // Assign stable ID to new events
      const extendedEvent = event as ExtendedCodexEvent;
      if (!extendedEvent.stableId) {
        extendedEvent.stableId = `${conversationId}-${event.payload.params.id}-${Date.now()}`;
      }
      
      const updatedEvents = [...currentEvents, extendedEvent].sort(
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
