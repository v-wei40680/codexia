import { useCallback } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { useChatInputStore } from "@/stores/chatInputStore";
import { useConversationStore } from "@/stores/useConversationStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import type { NewConversationResponse } from "@/bindings/NewConversationResponse";
import type { SendUserMessageParams } from "@/bindings/SendUserMessageParams";
import type { SendUserMessageResponse } from "@/bindings/SendUserMessageResponse";
import { type MediaAttachment } from "@/types/chat";
import { v4 } from "uuid";
import { buildMessageParams } from "@/utils/buildParams";
import { toast } from "sonner";

export function useSendMessage() {
  const { appendEvent, replaceEvents, setHydrationStatus } = useConversationStore();
  const { addConversation } = useConversationListStore();
  const { activeConversationId, setActiveConversationId } = useActiveConversationStore();
  const { setIsInitializing, setIsSending } = useSessionStore();
  const { cwd } = useCodexStore();
  const buildNewConversationParams = useBuildNewConversationParams();

  const createConversation = useCallback(
    async (initialMessage?: string): Promise<string | null> => {
      if (!buildNewConversationParams) {
        console.warn("Conversation parameters not built.");
        return null;
      }

      setIsInitializing(true);
      try {
        console.info("[chat] new_conversation", buildNewConversationParams);
        const conversation = await invoke<NewConversationResponse>(
          "new_conversation",
          { params: buildNewConversationParams },
        );

        console.info("[chat] conversation created", conversation);

        const conversationId = conversation.conversationId;
        addConversation(cwd, {
          conversationId,
          preview: initialMessage || useChatInputStore.getState().inputValue || "New conversation",
          path: conversation.rolloutPath,
          timestamp: new Date().toISOString(),
        });
        setActiveConversationId(conversationId);
        replaceEvents(conversationId, []);
        setHydrationStatus(conversationId, "ready");
        return conversationId;
      } catch (error) {
        console.error("Failed to start Codex conversation", error);
        return null;
      } finally {
        setIsInitializing(false);
      }
    },
    [
      addConversation,
      buildNewConversationParams,
      replaceEvents,
      setActiveConversationId,
      setIsInitializing,
      setHydrationStatus,
      cwd,
    ],
  );

  const sendConversationMessage = useCallback(
    async (params: SendUserMessageParams) => {
      console.debug("[chat] invoke send_user_message", params);
      await invoke<SendUserMessageResponse>("send_user_message", {
        params,
      });
      console.debug("[chat] send_user_message success", params.conversationId);
    },
    [],
  );

  const handleSendMessage = useCallback(async (messageOverride: string, attachments: MediaAttachment[] = []) => {
    if (!cwd) {
      toast.info("Select a project before sending messages.");
      return;
    }

    const originalMessage = messageOverride ?? useChatInputStore.getState().inputValue;
    const trimmed = originalMessage.trim();
    if (!trimmed && attachments.length === 0) return;

    setIsSending(true);

    let shouldResetSending = false;

    try {
      let targetConversationId = activeConversationId;
      if (!targetConversationId) {
        const newConversationId = await createConversation(trimmed);
        if (!newConversationId) {
          throw new Error("Failed to create conversation");
        }
        targetConversationId = newConversationId;
      }
      // Clear the message input after ensuring the conversation exists
      useChatInputStore.getState().setInputValue("");

      // Append the user's message to the conversation store
      const imageAttachments = attachments.filter(
        (attachment) => attachment.type === "image",
      );
      appendEvent(targetConversationId, {
        id: Date.now(),
        event: "",
        payload: { 
          method: "",
          params: {
            msg: {
              type: "user_message",
              message: trimmed,
              images:
                imageAttachments.length > 0
                  ? imageAttachments.map((attachment) => attachment.path)
                  : null,
            },
            id: v4(),
            conversationId: targetConversationId
          }
        },
      });

      const params = buildMessageParams(targetConversationId, trimmed, attachments)
      console.info(
        "[chat] send_user_message",
        targetConversationId,
        trimmed.length,
      );
      await sendConversationMessage(params);
    } catch (error) {
      shouldResetSending = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to send message", error);

      if (message.includes("conversation not found")) {
        console.warn(
          "Conversation missing on Codex server; creating a new one.",
        );
        const newConversationId = await createConversation();
        if (newConversationId) {
          try {
            console.info("[chat] resend send_user_message", newConversationId);
            const resendParams = buildMessageParams(newConversationId, trimmed, attachments)
            await sendConversationMessage(resendParams);
            shouldResetSending = false;
          } catch (resendErr) {
            console.error("Failed to resend message", resendErr);
          }
        }
      }
    }

    if (shouldResetSending) {
      setIsSending(false);
    }
  }, [
    activeConversationId,
    appendEvent,
    createConversation,
    cwd,
    sendConversationMessage,
    setIsSending,
  ]);

  return {
    handleSendMessage,
    createConversation,
  };
}
