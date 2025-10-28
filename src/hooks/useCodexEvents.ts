import { useCallback, useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { v4 } from "uuid";
import { invoke } from "@/lib/tauri-proxy";
import type { EventMsg } from "@/bindings/EventMsg";
import type { ConversationEventPayload, EventWithId } from "@/types/chat";
import { DELTA_EVENT_TYPES } from "@/types/chat";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";

type EventsByConversation = Record<string, EventWithId[]>;

interface UseCodexEventsParams {
  eventsByConversation: EventsByConversation;
  appendEvent: (conversationId: string, event: EventWithId) => void;
  setIsInitializing: (value: boolean) => void;
  setIsSending: (value: boolean) => void;
  isInitializing: boolean;
}

interface UseCodexEventsResult {
  deltaEventMap: EventsByConversation;
  initializeConversationBuffer: (conversationId: string) => void;
  clearConversationBuffer: (conversationId: string) => void;
}

export function useCodexEvents({
  eventsByConversation,
  appendEvent,
  setIsInitializing,
  setIsSending,
  isInitializing,
}: UseCodexEventsParams): UseCodexEventsResult {
  const [deltaEventMap, setDeltaEventMap] = useState<EventsByConversation>({});
  const { activeConversationId } = useActiveConversationStore();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    setDeltaEventMap((prev) => {
      let changed = false;
      const next: EventsByConversation = {};

      for (const [key, value] of Object.entries(prev)) {
        if (eventsByConversation[key]) {
          next[key] = value;
        } else {
          changed = true;
          console.debug("[chat] dropping delta buffer for conversation", key);
        }
      }

      if (!changed && Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }

      return next;
    });
  }, [eventsByConversation]);

  useEffect(() => {
    let isActive = true;
    let unlistenTauri: UnlistenFn | undefined;

    const setupListener = async () => {
      if (activeConversationId) {
        try {
          const id = await invoke("add_conversation_listener", {
            params: { conversationId: activeConversationId },
          });
          setSubscriptionId(id as string);
        } catch (error) {
          console.error("Failed to add conversation listener", error);
        }
      }

      unlistenTauri = await listen<ConversationEventPayload>(
        "codex:event",
        (event) => {
          if (!isActive) {
            return;
          }

          const payload = event.payload;
          if (!payload || !payload.params) return;

          const { conversationId, msg, id: incomingId } = payload.params;
          if (!conversationId || !msg) return;

          const eventMsg = msg as EventMsg;
          if (
            typeof eventMsg !== "object" ||
            typeof eventMsg.type !== "string"
          ) {
            return;
          }

          const eventId = v4();

          const eventRecord: EventWithId = {
            id: eventId,
            msg: eventMsg,
          };

          if (!eventMsg.type.endsWith("_delta")) {
            console.debug(
              "[codex:event]",
              conversationId,
              incomingId,
              eventMsg.type,
              eventRecord,
            );
          }

          if (DELTA_EVENT_TYPES.has(eventMsg.type)) {
            setDeltaEventMap((prev) => {
              const current = prev[conversationId] ?? [];
              if (current.some((item) => item.id === eventId)) {
                return prev;
              }
              return {
                ...prev,
                [conversationId]: [...current, eventRecord],
              };
            });
            return;
          }

          if (
            eventMsg.type !== "exec_command_output_delta" ||
            !eventMsg.type.startsWith("item")
          ) {
            if (eventMsg.type !== "user_message") {
              appendEvent(conversationId, eventRecord);
            }
          }

          if (
            eventMsg.type === "task_complete" ||
            eventMsg.type === "error" ||
            eventMsg.type === "turn_aborted"
          ) {
            setIsSending(false);
          }

          if (isInitializing && conversationId === activeConversationId) {
            setIsInitializing(false);
          }

          // Preserve delta events for the active conversation so live streaming output remains visible.
        },
      );
    };

    void setupListener().catch((error) => {
      console.error("Failed to initialize Codex listeners", error);
    });

    return () => {
      isActive = false;
      if (subscriptionId && activeConversationId) {
        console.warn(
          "emove conversation listener",
          activeConversationId,
          subscriptionId,
        );
        void invoke<void>("remove_conversation_listener", {
          params: { subscriptionId },
        }).catch((error) => {
          console.warn("Failed to remove conversation listener", error);
        });
      }
      if (unlistenTauri) {
        try {
          unlistenTauri();
        } catch (error) {
          console.warn("Failed to remove Codex event listener", error);
        }
      }
    };
  }, [
    appendEvent,
    setIsInitializing,
    setIsSending,
    isInitializing,
    activeConversationId,
    subscriptionId,
  ]);

  const initializeConversationBuffer = useCallback((conversationId: string) => {
    setDeltaEventMap((prev) => ({
      ...prev,
      [conversationId]: [],
    }));
  }, []);

  const clearConversationBuffer = useCallback((conversationId: string) => {
    setDeltaEventMap((prev) => {
      if (!prev[conversationId]) {
        return prev;
      }
      const { [conversationId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    deltaEventMap,
    initializeConversationBuffer,
    clearConversationBuffer,
  };
}
