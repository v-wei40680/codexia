import { useCallback, useEffect, useMemo, useRef } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { useConversationStore } from "@/stores/useConversationStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useSessionStore } from "@/stores/useSessionStore";

import { useCodexStore } from "@/stores/useCodexStore";
import { useCodexEvents } from "@/hooks/useCodexEvents";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useSendMessage } from "@/hooks/useSendMessage";
import type { InterruptConversationResponse } from "@/bindings/InterruptConversationResponse";

import { type CodexEvent } from "@/types/chat";

type ResumeConversationResult = {
  conversation_id: string;
  model: string;
  initialMessages?: CodexEvent["payload"]["params"]["msg"][] | null;
};

const extractInitialMessages = (
  response: ResumeConversationResult,
): CodexEvent["payload"]["params"]["msg"][] | null => {
  return (
    response.initialMessages ??
    null
  );
};

export function useChatSession() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const {
    eventsByConversation,
    hydrationByConversation,
    appendEvent,
    applyInitialHistory,
    setHydrationStatus,
  } = useConversationStore();

  const { activeConversationId } =
    useActiveConversationStore();

  const { isInitializing, isSending, setIsInitializing, setIsSending } =
    useSessionStore();

  const { cwd } = useCodexStore();
  const { handleSendMessage, createConversation } = useSendMessage();

  const {
    deltaEventMap,
    clearConversationBuffer,
  } = useCodexEvents({
    eventsByConversation,
    appendEvent,
    setIsInitializing,
    setIsSending,
    isInitializing,
  });

  useCodexApprovalRequests();

  const activeEvents: CodexEvent[] = useMemo(() => {
    if (!activeConversationId) return [];
    return eventsByConversation[activeConversationId] ?? [];
  }, [eventsByConversation, activeConversationId]);

  const activeDeltaEventsRef = useRef<CodexEvent[]>([]);

  const activeDeltaEvents: CodexEvent[] = useMemo(() => {
    if (!activeConversationId) return [];
    const newDeltaEvents = deltaEventMap[activeConversationId] ?? [];

    // Deep compare newDeltaEvents with the current value in the ref
    // If they are deeply equal, return the ref's current value to maintain referential stability
    if (
      JSON.stringify(newDeltaEvents) ===
      JSON.stringify(activeDeltaEventsRef.current)
    ) {
      return activeDeltaEventsRef.current;
    }

    activeDeltaEventsRef.current = newDeltaEvents;
    return newDeltaEvents;
  }, [deltaEventMap, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const hydration = hydrationByConversation[activeConversationId];
    const existing = eventsByConversation[activeConversationId] ?? [];
    if (existing.length > 0) {
      if (hydration?.status !== "ready") {
        setHydrationStatus(activeConversationId, "ready");
      }
      return;
    }

    if (hydration?.status === "ready" || hydration?.status === "loading") {
      return;
    }

    const listState = useConversationListStore.getState();
    const conversationCwd =
      listState.conversationIndex[activeConversationId] ?? cwd ?? "";
    const summaries = listState.conversationsByCwd[conversationCwd] ?? [];
    const summary = summaries.find(
      (item) => item.conversationId === activeConversationId,
    );
    const rolloutPath = summary?.path;
    if (!rolloutPath) {
      return;
    }

    setHydrationStatus(activeConversationId, "loading");
    void (async () => {
      try {
        const response = await invoke<ResumeConversationResult>(
          "resume_conversation",
          {
            params: {
              path: rolloutPath,
              overrides: null,
            },
          },
        );
        const initialMessages = extractInitialMessages(response);
        if (
          Array.isArray(initialMessages) &&
          initialMessages.length > 0
        ) {
          applyInitialHistory(activeConversationId, initialMessages);
        } else {
          setHydrationStatus(activeConversationId, "ready");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error(
          "Failed to resume conversation",
          error,
        );
        setHydrationStatus(activeConversationId, "error", message);
      }
    })();
  }, [
    activeConversationId,
    applyInitialHistory,
    cwd,
    eventsByConversation,
    hydrationByConversation,
    setHydrationStatus,
  ]);

  const activeHydration = useMemo(() => {
    if (!activeConversationId) {
      return undefined;
    }
    return hydrationByConversation[activeConversationId];
  }, [activeConversationId, hydrationByConversation]);

  const handleInterrupt = useCallback(async () => {
    if (!activeConversationId) {
      console.warn("No active conversation to interrupt.");
      return;
    }

    if (!isSending) {
      console.debug("Interrupt ignored; nothing is streaming.");
      return;
    }

    const conversationId = activeConversationId;

    try {
      console.info("[chat] interrupt_conversation", conversationId);
      await invoke<InterruptConversationResponse>("interrupt_conversation", {
        params: { conversationId },
      });
    } catch (error) {
      console.error("Failed to interrupt conversation", error);
    }
    clearConversationBuffer(conversationId);
    setIsSending(false);
  }, [
    activeConversationId,
    activeDeltaEvents,
    appendEvent,
    clearConversationBuffer,
    isSending,
    setIsSending,
  ]);

  return {
    textAreaRef,
    activeConversationId,
    activeEvents,
    activeDeltaEvents,
    activeHydration,
    handleSendMessage,
    handleInterrupt,
    isSending,
    isInitializing,
    canCompose: Boolean(cwd),
    createConversation,
  };
}
