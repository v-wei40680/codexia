import { useState, useCallback } from "react";
import {
  useConversation,
  useSendMessage,
} from "@/hooks/useCodex";
import { Button } from "./ui/button";
import type { CodexEvent, MediaAttachment } from "@/types/chat";
import { buildMessageParams } from "@/utils/buildParams";
import { ChatCompose } from "./chat/ChatCompose";
import { SimpleConversationList } from "./SimpleConversationList";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { PenSquare } from "lucide-react";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useConversationEvents } from "@/hooks/useCodex/useConversationEvents";
import { useEventStreamStore } from "@/stores/useEventStreamStore";
import { EventItem } from "@/components/events/EventItem";
import DeltaEventLog from "./DeltaEventLog";

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

export function ChatInterface() {
  useCodexApprovalRequests();
  const { createConversation } = useConversation();
  const [inputValue, setInputValue] = useState("");
  const [events, setEvents] = useState<CodexEvent[]>([]);
  const { appendDelta, finalizeMessage } = useEventStreamStore();
  const { sendMessage, interrupt, isSending } = useSendMessage();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { activeConversationId, setActiveConversationId } = useActiveConversationStore();

  const upsertEvent = useCallback((event: CodexEvent) => {
    setEvents((prev) => {
      const key = getEventKey(event);
      const index = prev.findIndex((existing) => getEventKey(existing) === key);

      if (index === -1) {
        return [...prev, event];
      }

      const next = [...prev];
      next[index] = event;
      return next;
    });
  }, []);

  useConversationEvents(activeConversationId, {
    onAnyEvent: (event: CodexEvent) => {
      if (event.payload.params.msg.type.endsWith("_delta")) {
        appendDelta(event);
      } else {
        upsertEvent(event);
      }
    },

    onAgentMessage: (event) => {
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
      console.log("createConversation", buildNewConversationParams);
      const newConversation = await createConversation(
        buildNewConversationParams,
      );
      currentConversationId = newConversation.conversationId;
      setActiveConversationId(currentConversationId);
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

  const handleCreateConversation = async () => {
    const newConversation = await createConversation(buildNewConversationParams);
    setActiveConversationId(newConversation.conversationId);
    setEvents([]);
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-col border-r">
        <div className="p-2">
          <Button onClick={handleCreateConversation} className="w-full">
            <PenSquare className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <SimpleConversationList
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
        />
      </div>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {events.map((ev) => (
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
            onStopStreaming={() => activeConversationId && interrupt(activeConversationId)}
            disabled={isSending}
        />
      </div>
    </div>
  );
}
