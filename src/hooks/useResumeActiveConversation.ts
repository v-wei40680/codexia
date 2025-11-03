import { useEffect, useMemo, useRef } from "react";
import { useCodexStore } from "@/stores/useCodexStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useTokenCountStore } from "@/stores/useTokenCountStore";
import { useResumeConversation } from "@/hooks/useResumeConversation";

export const useResumeActiveConversation = (
  activeConversationId: string | null | undefined,
) => {
  const { cwd } = useCodexStore();
  const { conversationsByCwd } = useConversationListStore();
  const { clearTokenUsage } = useTokenCountStore();
  const { handleSelectConversation } = useResumeConversation();
  const lastResumedKeyRef = useRef<string | null>(null);

  const activeConversationSummary = useMemo(() => {
    if (!activeConversationId) return null;
    const cwdKey = cwd ?? "";
    const list = conversationsByCwd[cwdKey] ?? [];
    return (
      list.find(
        (conversation) =>
          conversation.conversationId === activeConversationId,
      ) ?? null
    );
  }, [activeConversationId, conversationsByCwd, cwd]);

  const activeConversationPath = activeConversationSummary?.path ?? null;

  useEffect(() => {
    if (!activeConversationId) {
      lastResumedKeyRef.current = null;
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || !activeConversationPath) return;
    const resumeKey = `${activeConversationId}:${activeConversationPath}`;
    if (lastResumedKeyRef.current === resumeKey) return;
    lastResumedKeyRef.current = resumeKey;

    const resumeConversation = async () => {
      try {
        clearTokenUsage(activeConversationId);
        await handleSelectConversation(
          activeConversationId,
          activeConversationPath,
        );
      } catch (error) {
        console.error("Failed to resume conversation", error);
        lastResumedKeyRef.current = null;
      }
    };

    void resumeConversation();
  }, [
    activeConversationId,
    activeConversationPath,
    clearTokenUsage,
    handleSelectConversation,
  ]);

  return { activeConversationPath };
};
