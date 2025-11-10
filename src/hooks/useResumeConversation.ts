import { useCallback } from "react";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useConversation } from "@/hooks/useCodex";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useEventStore } from "@/stores/useEventStore";
import { extractInitialMessages, type CodexEvent } from "@/types/chat";
import { readEventMessages } from "@/utils/appendEventLine";
import { exists, BaseDirectory } from '@tauri-apps/plugin-fs';

const pendingResumes = new Set<string>();

export const useResumeConversation = () => {
  const {
    addActiveConversationId,
    setActiveConversationId,
    activeConversationIds: rawActiveConversationIds,
  } = useActiveConversationStore();
  const { resumeConversation } = useConversation();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { addEvent } = useEventStore();

  const handleSelectConversation = useCallback(
    async (conversationId: string, path: string, cwd: string) => {
      const activeConversationIds =
        rawActiveConversationIds instanceof Set
          ? rawActiveConversationIds
          : new Set<string>();

      const shouldResume =
        !activeConversationIds.has(conversationId) ||
        activeConversationIds.size === 0;

      if (!shouldResume) {
        setActiveConversationId(conversationId);
        return;
      }

      if (!path) {
        setActiveConversationId(conversationId);
        return;
      }

      if (pendingResumes.has(conversationId)) {
        return;
      }

      pendingResumes.add(conversationId);
      try {
        console.log("Resuming conversation", conversationId, path);
        const resumedConversation = await resumeConversation(
          path,
          buildNewConversationParams,
        );
        console.log("Resumed conversation", resumedConversation);
        setActiveConversationId(resumedConversation.conversationId);
        addActiveConversationId(resumedConversation.conversationId);
        const eventsPath = `.codexia/projects/${btoa(cwd)}/${conversationId}.jsonl`
        const eventsPathExists = await exists(eventsPath, {
          baseDir: BaseDirectory.Home,
        });
        console.log("eventsPathExists", eventsPathExists)
        if (eventsPathExists) {
          await readEventMessages(eventsPath, conversationId, addEvent)
        } else {
          const initialMessages = extractInitialMessages(resumedConversation);
          if (initialMessages) {
            let currentTurn = -1;
            const baseId = Date.now();
            initialMessages.forEach(
              (msg: CodexEvent["payload"]["params"]["msg"], idx: number) => {
                if (msg.type === "user_message") {
                  currentTurn += 1;
                }
                const turnId = String(currentTurn === -1 ? 0 : currentTurn);
                addEvent(resumedConversation.conversationId, {
                  id: baseId + idx,
                  event: "codex:event",
                  payload: {
                    method: `codex/event/${msg.type}`,
                    params: {
                      conversationId: resumedConversation.conversationId,
                      id: turnId,
                      msg,
                    },
                  },
                });
              },
            );
          }
        }
      } finally {
        pendingResumes.delete(conversationId);
      }
    },
    [
      rawActiveConversationIds,
      addEvent,
      buildNewConversationParams,
      resumeConversation,
      setActiveConversationId,
    ],
  );

  return { handleSelectConversation };
};
