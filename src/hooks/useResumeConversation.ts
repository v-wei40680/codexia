import { useCallback } from "react";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";

import { useConversation } from "@/hooks/useCodex";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useEventStore } from "@/stores/useEventStore";
import { extractInitialMessages, type CodexEvent } from "@/types/chat";
import { v4 } from "uuid";

const pendingResumes = new Set<string>();

export const useResumeConversation = () => {
  const {
    addActiveConversationId,
    setActiveConversationId,
    activeConversationIds: rawActiveConversationIds,
    clearPendingConversation,
  } = useActiveConversationStore();
  const { resumeConversation } = useConversation();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { addEvent } = useEventStore();

  const handleSelectConversation = useCallback(
    async (conversationId: string, path: string) => {
      const activeConversationIds =
        rawActiveConversationIds instanceof Set
          ? rawActiveConversationIds
          : new Set<string>();

      const shouldResume =
        !activeConversationIds.has(conversationId) ||
        activeConversationIds.size === 0;

      if (!shouldResume) {
        clearPendingConversation();
        setActiveConversationId(conversationId);
        return;
      }

      if (!path) {
        clearPendingConversation();
        setActiveConversationId(conversationId);
        return;
      }

      if (pendingResumes.has(conversationId)) {
        return;
      }

      pendingResumes.add(conversationId);
      clearPendingConversation();
      try {
        console.log("Resuming conversation", conversationId, path);
        const resumedConversation = await resumeConversation(
          path,
          buildNewConversationParams,
        );
        console.log("Resumed conversation", resumedConversation);
        setActiveConversationId(resumedConversation.conversationId);
        addActiveConversationId(resumedConversation.conversationId);
        const initialMessages = extractInitialMessages(resumedConversation);
        if (initialMessages) {
          initialMessages.forEach(
            (msg: CodexEvent["payload"]["params"]["msg"]) => {
              addEvent(resumedConversation.conversationId, {
                id: Date.now(),
                event: "codex:event",
                payload: {
                  method: `codex/event/${msg.type}`,
                  params: {
                    conversationId: resumedConversation.conversationId,
                    id: v4(),
                    msg,
                  },
                },
              });
            },
          );
        }
      } finally {
        pendingResumes.delete(conversationId);
      }
    },
    [
      rawActiveConversationIds,
      addEvent,
      buildNewConversationParams,
      clearPendingConversation,
      resumeConversation,
      setActiveConversationId,
    ],
  );

  return { handleSelectConversation };
};
