import { useState, useCallback } from "react";
import { useConversation, useSendMessage } from "@/hooks/useCodex";
import { Button } from "./ui/button";
import {
  type CodexEvent,
  type MediaAttachment,
} from "@/types/chat";
import { buildMessageParams } from "@/utils/buildParams";
import { ChatCompose } from "./chat/ChatCompose";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useConversationListStore } from "@/stores/useConversationListStore";
import { PenSquare } from "lucide-react";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useCodexStore } from "@/stores/useCodexStore";
import { useConversationEvents } from "@/hooks/useCodex/useConversationEvents";
import { useEventStreamStore } from "@/stores/useEventStreamStore";
import { useEventStore } from "@/stores/useEventStore";
import { EventItem } from "@/components/events/EventItem";
import DeltaEventLog from "./DeltaEventLog";
import { ChatToolbar } from "./layout/ChatToolBar";

const STREAM_TYPE_NORMALIZATION: Record<string, string> = {
  agent_message_delta: "agent_message",
  agent_reasoning_delta: "agent_reasoning",
  agent_reasoning_raw_content_delta: "agent_reasoning_raw_content",
};

const getEventKey = (event: CodexEvent) => {
  const {
    params: { id, msg },
  } = event.payload;
  const normalizedType = STREAM_TYPE_NORMALIZATION[msg.type] ?? msg.type;
  return `${id}:${normalizedType}`;
};

export function ChatView() {
  useCodexApprovalRequests();
  const {
    createConversation,
    status: conversationStatus,
  } = useConversation();
  const [inputValue, setInputValue] = useState("");
  const { appendDelta, finalizeMessage } = useEventStreamStore();
  const { events, addEvent, clearEvents } = useEventStore();
  const {
    activeConversationId,
    setActiveConversationId,
  } = useActiveConversationStore();
  const { cwd } = useCodexStore();
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { sendMessage, interrupt, isSending } = useSendMessage();
  const buildNewConversationParams = useBuildNewConversationParams();

  const upsertEvent = useCallback(
    (event: CodexEvent) => {
      if (activeConversationId) {
        addEvent(activeConversationId, event);
      }
    },
    [activeConversationId, addEvent],
  );

  useConversationEvents(activeConversationId, {
    isConversationReady: conversationStatus === "ready",
    onAnyEvent: (event: CodexEvent) => {
      if (!event.createdAt) {
        event.createdAt = Date.now();
      }
      if (event.payload.params.msg.type.endsWith("_delta")) {
        appendDelta(event);
      } else {
        upsertEvent(event);
      }
    },

    onAgentMessage: (event) => {
      if (!event.createdAt) {
        event.createdAt = Date.now();
      }
      finalizeMessage(event);
    },
  });

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleSendMessage = async (
    text: string,
    attachments: MediaAttachment[],
  ) => {
    let currentConversationId = activeConversationId;
    if (!currentConversationId) {
      await handleCreateConversation(text);
    }
    if (currentConversationId) {
      const params = buildMessageParams(
        currentConversationId,
        text.trim(),
        attachments,
      );
      console.log("sendMessage params:", params);
      sendMessage(currentConversationId, params.items);
    }
  };

  const handleCreateConversation = async (preview = "New Chat") => {
    const newConversation = await createConversation(
      buildNewConversationParams,
    );
    useConversationListStore.getState().addConversation(cwd, {
      conversationId: newConversation.conversationId,
      preview: preview,
      timestamp: new Date().toISOString(),
      path: newConversation.rolloutPath,
    });
    setActiveConversationId(newConversation.conversationId);
    useActiveConversationStore
      .getState()
      .addConversationId(newConversation.conversationId);
    clearEvents(newConversation.conversationId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex px-2 justify-between">
          <Button size="icon" onClick={() => handleCreateConversation()}>
            <PenSquare />
          </Button>
          <ChatToolbar />
      </div>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {currentEvents.map((ev) => (
            <EventItem
              key={getEventKey(ev)}
              event={ev}
              conversationId={ev.payload.params.conversationId}
            />
          ))}
          <DeltaEventLog />
        </div>

        <ChatCompose
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          onStopStreaming={() =>
            activeConversationId && interrupt(activeConversationId)
          }
          disabled={isSending}
        />
      </div>
    </div>
  );
}
