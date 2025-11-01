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
  
  // Only merge if deltaEvent is actually a delta type
  if (!isDeltaEvent(deltaMsg.type)) return false;
  
  const baseType = getBaseEventType(deltaMsg.type);
  
  // Check if existing event matches the base type or is also a delta of same type
  if (existingMsg.type !== baseType && existingMsg.type !== deltaMsg.type) {
    return false;
  }
  
  // For events with item_id (reasoning_content_delta, agent_message_content_delta)
  if ("item_id" in existingMsg && "item_id" in deltaMsg) {
    return existingMsg.item_id === deltaMsg.item_id;
  }
  
  // For events with call_id (if any)
  if ("call_id" in existingMsg && "call_id" in deltaMsg) {
    return existingMsg.call_id === deltaMsg.call_id;
  }
  
  // For simple deltas without IDs (agent_message_delta, agent_reasoning_delta)
  // Only merge if they're consecutive and of the same type
  return true;
};

const mergeDeltaIntoEvent = (existingEvent: CodexEvent, deltaEvent: CodexEvent): CodexEvent => {
  const existingMsg = existingEvent.payload.params.msg;
  const deltaMsg = deltaEvent.payload.params.msg;

  // Safety check: delta event must have delta field
  if (!("delta" in deltaMsg) || typeof deltaMsg.delta !== "string") {
    return existingEvent;
  }

  let mergedMsg: EventMsg | null = null;

  switch (deltaMsg.type) {
    case "agent_message_delta": {
      // Get previous content from either base type or delta type
      const previousContent =
        existingMsg.type === "agent_message"
          ? existingMsg.message
          : existingMsg.type === "agent_message_delta"
            ? existingMsg.delta
            : "";

      // Always convert to base type after merging
      mergedMsg = {
        type: "agent_message",
        message: `${previousContent}${deltaMsg.delta}`,
      } as Extract<EventMsg, { type: "agent_message" }>;
      break;
    }
    
    case "agent_reasoning_delta": {
      const previousContent =
        existingMsg.type === "agent_reasoning"
          ? existingMsg.text
          : existingMsg.type === "agent_reasoning_delta"
            ? existingMsg.delta
            : "";

      mergedMsg = {
        type: "agent_reasoning",
        text: `${previousContent}${deltaMsg.delta}`,
      } as Extract<EventMsg, { type: "agent_reasoning" }>;
      break;
    }
    
    case "agent_reasoning_raw_content_delta": {
      const previousContent =
        existingMsg.type === "agent_reasoning_raw_content"
          ? existingMsg.text
          : existingMsg.type === "agent_reasoning_raw_content_delta"
            ? existingMsg.delta
            : "";

      mergedMsg = {
        type: "agent_reasoning_raw_content",
        text: `${previousContent}${deltaMsg.delta}`,
      } as Extract<EventMsg, { type: "agent_reasoning_raw_content" }>;
      break;
    }
    
    case "agent_message_content_delta": {
      // This type has item_id, keep accumulating deltas
      const previousContent =
        existingMsg.type === "agent_message_content_delta"
          ? existingMsg.delta
          : "";

      mergedMsg = {
        type: "agent_message_content_delta",
        thread_id: deltaMsg.thread_id,
        turn_id: deltaMsg.turn_id,
        item_id: deltaMsg.item_id,
        delta: `${previousContent}${deltaMsg.delta}`,
      } as Extract<EventMsg, { type: "agent_message_content_delta" }>;
      break;
    }
    
    case "reasoning_content_delta": {
      const previousContent =
        existingMsg.type === "reasoning_content_delta" 
          ? existingMsg.delta 
          : "";

      mergedMsg = {
        type: "reasoning_content_delta",
        thread_id: deltaMsg.thread_id,
        turn_id: deltaMsg.turn_id,
        item_id: deltaMsg.item_id,
        delta: `${previousContent}${deltaMsg.delta}`,
      } as Extract<EventMsg, { type: "reasoning_content_delta" }>;
      break;
    }
    
    case "reasoning_raw_content_delta": {
      const previousContent =
        existingMsg.type === "reasoning_raw_content_delta" 
          ? existingMsg.delta 
          : "";

      mergedMsg = {
        type: "reasoning_raw_content_delta",
        thread_id: deltaMsg.thread_id,
        turn_id: deltaMsg.turn_id,
        item_id: deltaMsg.item_id,
        delta: `${previousContent}${deltaMsg.delta}`,
      } as Extract<EventMsg, { type: "reasoning_raw_content_delta" }>;
      break;
    }
  }

  if (!mergedMsg) {
    return existingEvent;
  }

  return {
    ...existingEvent,
    payload: {
      ...existingEvent.payload,
      params: {
        ...existingEvent.payload.params,
        msg: mergedMsg,
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
      
      if (import.meta.env.DEV) {
        console.log(`[Store] Adding event: ${eventMsg.type}`, {
          isDelta: isDeltaEvent(eventMsg.type),
          currentCount: currentEvents.length,
        });
      }
      
      // Only try to merge if this is a delta event
      if (isDeltaEvent(eventMsg.type)) {
        // Look for existing event to merge with (search from end for most recent)
        for (let i = currentEvents.length - 1; i >= 0; i--) {
          const existingEvent = currentEvents[i] as ExtendedCodexEvent;
          if (canMergeDelta(existingEvent, event)) {
            if (import.meta.env.DEV) {
              console.log(`[Store] Merging delta into event at index ${i}`, {
                existingType: existingEvent.payload.params.msg.type,
                deltaType: eventMsg.type,
              });
            }
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
        
        if (import.meta.env.DEV) {
          console.log(`[Store] No merge target found, adding delta as new event`);
        }
        // If no existing event found to merge with, add as new event
        // This handles the first delta which creates the base event
      }
      
      // Add as new event (either non-delta or first delta)
      const extendedEvent = event as ExtendedCodexEvent;
      if (!extendedEvent.stableId) {
        extendedEvent.stableId = `${conversationId}-${event.payload.params.id}-${Date.now()}`;
      }
      
      const updatedEvents = [...currentEvents, extendedEvent].sort(
        (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
      );
      
      if (import.meta.env.DEV) {
        console.log(`[Store] Added new event, total: ${updatedEvents.length}`);
      }

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
