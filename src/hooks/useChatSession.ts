import { useCallback, useMemo, useRef } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { useCodexEvents } from "@/hooks/useCodexEvents";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useSendMessage } from "@/hooks/useSendMessage";
import type { InterruptConversationResponse } from "@/bindings/InterruptConversationResponse";
import { useResumeConversation } from "@/hooks/useResumeConversation";
import { useConversationStore } from "@/stores/useConversationStore";
import { type CodexEvent } from "@/types/chat";



export function useChatSession() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const { eventsByConversation, appendEvent } = useConversationStore();

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



  const { activeHydration } = useResumeConversation();

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
