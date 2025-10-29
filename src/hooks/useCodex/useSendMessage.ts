import { useState } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { InputItem } from "@/bindings/InputItem";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { buildMessageParams } from "@/utils/buildParams";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { type MediaAttachment } from "@/types/chat";
import { useCodexStore } from "@/stores/useCodexStore";
import { useEventStore } from "@/stores/useEventStore";
import { useConversation } from "./useConversation";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";

export function useSendMessage() {
  const [isSending, setIsSending] = useState(false);
  const buildNewConversationParams = useBuildNewConversationParams();
  const { cwd } = useCodexStore();
  const { clearEvents } = useEventStore();
  const { createConversation, markConversationReady } = useConversation();
  const setActiveConversationId = useActiveConversationStore(
    (state) => state.setActiveConversationId,
  );

  const sendMessage = async (conversationId: string, items: InputItem[]) => {
    setIsSending(true);
    try {
      await invoke("send_user_message", {
        params: {
          conversationId,
          items,
        },
      });
      markConversationReady();
    } finally {
      setIsSending(false);
    }
  };

  const interrupt = async (conversationId: string) => {
    await invoke("interrupt_conversation", {
      params: { conversationId },
    });
  };

  const handleSendMessage = async (
    text: string,
    attachments: MediaAttachment[],
  ) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return;
    }

    let currentConversationId =
      useActiveConversationStore.getState().activeConversationId;

    if (!currentConversationId) {
      currentConversationId = await handleCreateConversation(trimmedText);
    }

    if (!currentConversationId) {
      return;
    }

    useActiveConversationStore.getState().clearPendingConversation();

    const params = buildMessageParams(
      currentConversationId,
      trimmedText,
      attachments,
    );
    console.log("sendMessage params:", params);
    sendMessage(currentConversationId, params.items);
  };

  const handleCreateConversation = async (
    preview = "New Chat",
  ): Promise<string> => {
    const newConversation = await createConversation(
      buildNewConversationParams,
    );
    useActiveConversationStore.getState().clearPendingConversation();
    await useConversationListStore.getState().addConversation(cwd, {
      conversationId: newConversation.conversationId,
      preview,
      timestamp: new Date().toISOString(),
      path: newConversation.rolloutPath,
    });
    setActiveConversationId(newConversation.conversationId);
    useActiveConversationStore
      .getState()
      .addConversationId(newConversation.conversationId);
    clearEvents(newConversation.conversationId);
    return newConversation.conversationId;
  };

  const beginPendingConversation = () => {
    useActiveConversationStore.getState().startPendingConversation();
  };

  return {
    sendMessage,
    interrupt,
    isSending,
    handleCreateConversation,
    handleSendMessage,
    beginPendingConversation,
  };
}
