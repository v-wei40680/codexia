import { useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

import { getNewConversationParams } from "@/components/config/ConversationParams";
import { useConversationStore } from "@/stores/useConversationStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useProviderStore } from "@/stores/useProviderStore";
import { useSandboxStore } from "@/stores/useSandboxStore";
import { useCodexStore } from "@/stores/useCodexStore";
import { useCodexEvents } from "@/hooks/useCodexEvents";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useChatInputStore } from "@/stores/chatInputStore";
import type { InterruptConversationResponse } from "@/bindings/InterruptConversationResponse";
import type { NewConversationResponse } from "@/bindings/NewConversationResponse";
import type { SendUserMessageParams } from "@/bindings/SendUserMessageParams";
import type { SendUserMessageResponse } from "@/bindings/SendUserMessageResponse";
import type { InputItem } from "@/bindings/InputItem";
import { type ConversationEvent, type EventWithId, type MediaAttachment } from "@/types/chat";

function buildTextMessageParams(
  conversationId: string,
  text: string,
): SendUserMessageParams {
  const textItem: InputItem = {
    type: "text",
    data: { text },
  };
  return {
    conversationId,
    items: [textItem],
  };
}

function buildUserMessageParams(
  conversationId: string,
  text: string,
  attachments: MediaAttachment[],
): SendUserMessageParams {
  const textItem: InputItem = {
    type: "text",
    data: { text },
  };

  const imageItems: InputItem[] = attachments
    .filter((attachment) => attachment.type === "image")
    .map((attachment) => ({
      type: "localImage",
      data: { path: attachment.path },
    }));

  if (imageItems.length < attachments.length) {
    const unsupported = attachments
      .filter((attachment) => attachment.type !== "image")
      .map((attachment) => attachment.type);
    if (unsupported.length > 0) {
      console.warn(
        "[chat] Unsupported attachment types omitted from message:",
        unsupported.join(", "),
      );
    }
  }

  return {
    conversationId,
    items: [textItem, ...imageItems],
  };
}

export function useChatSession() {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const createConversationPromiseRef = useRef<Promise<string | null> | null>(
    null,
  );

  const {
    eventsByConversation,
    appendEvent,
    replaceEvents,
  } = useConversationStore();

  const { addConversation } = useConversationListStore();

  const { activeConversationId, setActiveConversationId } =
    useActiveConversationStore();

  const { isInitializing, isSending, setIsInitializing, setIsSending } =
    useSessionStore();

  const { providers, selectedProviderId, selectedModel, reasoningEffort } =
    useProviderStore();
  const { mode, approvalPolicy } = useSandboxStore();
  const { cwd, webSearchEnabled } = useCodexStore();

  const {
    deltaEventMap,
    initializeConversationBuffer,
    clearConversationBuffer,
  } = useCodexEvents({
    eventsByConversation,
    appendEvent,
    setIsInitializing,
    setIsSending,
    isInitializing,
  });

  useCodexApprovalRequests();

  const activeEvents: ConversationEvent[] = useMemo(() => {
    if (!activeConversationId) return [];
    return eventsByConversation[activeConversationId] ?? [];
  }, [eventsByConversation, activeConversationId]);

  const activeDeltaEventsRef = useRef<EventWithId[]>([]);

  const activeDeltaEvents: EventWithId[] = useMemo(() => {
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

  const createConversation = useCallback(
    async (initialMessage?: string): Promise<string | null> => {
    if (createConversationPromiseRef.current) {
      return createConversationPromiseRef.current;
    }

    if (!cwd) {
      console.warn("Select a project before starting a conversation.");
      return null;
    }

    const provider = providers.find((item) => item.id === selectedProviderId);

    const promise = (async () => {
      setIsInitializing(true);
      try {
        const params = getNewConversationParams(
          provider,
          selectedModel ?? null,
          cwd,
          approvalPolicy,
          mode,
          {
            model_reasoning_effort: reasoningEffort,
            "tools.web_search": webSearchEnabled,
          },
        );

        console.info("[chat] new_conversation", params);
        const conversation = await invoke<NewConversationResponse>(
          "new_conversation",
          { params },
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
        initializeConversationBuffer(conversationId);
        return conversationId;
      } catch (error) {
        console.error("Failed to start Codex conversation", error);
        return null;
      } finally {
        setIsInitializing(false);
        createConversationPromiseRef.current = null;
      }
    })();

    createConversationPromiseRef.current = promise;
    return promise;
  }, [
    addConversation,
    approvalPolicy,
    cwd,
    initializeConversationBuffer,
    mode,
    providers,
    reasoningEffort,
    replaceEvents,
    selectedModel,
    selectedProviderId,
    setActiveConversationId,
    setIsInitializing,
  ]);

  const sendConversationMessage = useCallback(
    async (params: SendUserMessageParams) => {
      console.debug(
        "[chat] invoke send_user_message",
        params.conversationId,
        params.items.length,
      );
      await invoke<SendUserMessageResponse>("send_user_message", {
        params,
      });
      console.debug("[chat] send_user_message success", params.conversationId);
    },
    [],
  );

  const handleSendMessage = useCallback(async (messageOverride: string, attachments: MediaAttachment[] = []) => {
    if (!cwd) {
      console.warn("Select a project before sending messages.");
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
        id: `user-message-${Date.now()}`,
        msg: {
          type: "user_message",
          message: trimmed,
          images:
            imageAttachments.length > 0
              ? imageAttachments.map((attachment) => attachment.path)
              : null,
        },
      });

      const params =
        attachments.length > 0
          ? buildUserMessageParams(targetConversationId, trimmed, attachments)
          : buildTextMessageParams(targetConversationId, trimmed);
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
            const resendParams =
              attachments.length > 0
                ? buildUserMessageParams(newConversationId, trimmed, attachments)
                : buildTextMessageParams(newConversationId, trimmed);
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

    const agentMessagePreview = activeDeltaEvents
      .filter(
        (event) =>
          event.msg.type === "agent_message_delta" &&
          typeof (event.msg as { delta?: unknown }).delta === "string",
      )
      .map((event) => (event.msg as { delta: string }).delta)
      .join("");

    if (agentMessagePreview.trim().length > 0) {
      appendEvent(conversationId, {
        id: `agent-message-${Date.now()}`,
        msg: {
          type: "agent_message",
          message: agentMessagePreview,
        },
      });
    }

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

  const handlePrepareNewConversation = useCallback(() => {
    if (!cwd) {
      console.warn("Select a project before starting a conversation.");
      return;
    }
    setActiveConversationId(null);
    useChatInputStore.getState().setInputValue("");
    useChatInputStore.getState().requestFocus();
  }, [cwd, setActiveConversationId]);

  return {
    textAreaRef,
    activeConversationId,
    activeEvents,
    activeDeltaEvents,
    handleSendMessage,
    handleInterrupt,
    isSending,
    isInitializing,
    canCompose: Boolean(cwd),
    handlePrepareNewConversation,
  };
}
