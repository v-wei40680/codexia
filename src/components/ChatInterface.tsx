import { useState } from "react";
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
import { v4 } from "uuid";

export function ChatInterface() {
  useCodexApprovalRequests();
  const { createConversation } = useConversation();
  const { activeConversationId: conversationId } = useActiveConversationStore();
  const [inputValue, setInputValue] = useState("");
  const [events, setEvents] = useState<CodexEvent[]>([]);
  const { appendDelta, finalizeMessage } = useEventStreamStore()
  const { sendMessage, interrupt, isSending } = useSendMessage();
  const buildNewConversationParams = useBuildNewConversationParams();
  const { activeConversationId, setActiveConversationId } =
    useActiveConversationStore();

    useConversationEvents(conversationId, {
      onAnyEvent: (event: CodexEvent) => {
        const { msg } = event.payload.params;
  
        if (!msg.type.endsWith("_delta")) {
          const newEvent: CodexEvent = event
          setEvents((prev) => [...prev, newEvent]);
        }
      },
  
      onAgentMessageDelta: (event) => {
        appendDelta(event);
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
    let currentConversationId = conversationId;
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
    setEvents([])
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
            key={v4()}
            event={ev}
            conversationId={ev.payload.params.conversationId}
          />
        ))}
        </div>

        <ChatCompose
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onStopStreaming={() => conversationId && interrupt(conversationId)}
            disabled={isSending}
        />
      </div>
    </div>
  );
}
