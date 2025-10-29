import { useEffect } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { useConversationStore } from "@/stores/useConversationStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useCodexStore } from "@/stores/useCodexStore";
import type { CodexEvent } from "@/types/chat";

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

export function useResumeConversation() {
  const {
    eventsByConversation,
    hydrationByConversation,
    applyInitialHistory,
    setHydrationStatus,
  } = useConversationStore();

  const { activeConversationId } =
    useActiveConversationStore();

  const { cwd } = useCodexStore();

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

  return {
    activeHydration: activeConversationId
      ? hydrationByConversation[activeConversationId]
      : undefined,
  };
}
