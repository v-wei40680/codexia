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
import { useSessionStore } from "@/stores/useSessionStore";
import { useProviderStore } from "@/stores/useProviderStore";

export function useSendMessage() {
  const {isBusy, setIsBusy} = useSessionStore();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { cwd } = useCodexStore();
  const { clearEvents } = useEventStore();
  const { createConversation, markConversationReady } = useConversation();
  const {setActiveConversationId, clearPendingConversation, addActiveConversationId} = useActiveConversationStore();
  const {selectedProviderId} = useProviderStore();

  const sendMessage = async (conversationId: string, items: InputItem[]) => {
    setIsBusy(true);
    try {
      await invoke("send_user_message", {
        params: {
          conversationId,
          items,
        },
      });
      markConversationReady();
    } catch (error) {
      setIsBusy(false);
      throw error;
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

    clearPendingConversation();

    const params = buildMessageParams(
      currentConversationId,
      trimmedText,
      attachments,
    );
    console.log("sendMessage params:", params);
    void sendMessage(currentConversationId, params.items).catch((error) => {
      console.error("Failed to send message:", error);
    });
  };

  const handleCreateConversation = async (
    preview = "New Chat",
  ): Promise<string> => {
    const newConversation = await createConversation(
      buildNewConversationParams,
    );
    clearPendingConversation();
    await useConversationListStore.getState().addConversation(cwd, {
      conversationId: newConversation.conversationId,
      preview,
      timestamp: new Date().toISOString(),
      path: newConversation.rolloutPath,
      modelProvider: selectedProviderId,
    });
    setActiveConversationId(newConversation.conversationId);
    addActiveConversationId(newConversation.conversationId);
    clearEvents(newConversation.conversationId);
    return newConversation.conversationId;
  };

  return {
    sendMessage,
    interrupt,
    isBusy,
    handleCreateConversation,
    handleSendMessage,
  };
}
