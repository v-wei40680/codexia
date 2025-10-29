import { useCallback } from "react";
import { useConversation, useSendMessage } from "@/hooks/useCodex";
import { Button } from "./ui/button";
import { ChatCompose } from "./chat/ChatCompose";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { PenSquare } from "lucide-react";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useConversationEvents } from "@/hooks/useCodex/useConversationEvents";
import { useEventStreamStore } from "@/stores/useEventStreamStore";
import { useEventStore } from "@/stores/useEventStore";
import { ChatToolbar } from "./layout/ChatToolBar";
import { useChatInputStore } from "@/stores/chatInputStore";
import { ChatScrollArea } from "./chat/ChatScrollArea";
import { type CodexEvent } from "@/types/chat";

export function ChatView() {
  useCodexApprovalRequests();
  const { status: conversationStatus } = useConversation();
  const { appendDelta, finalizeMessage } = useEventStreamStore();
  const { events, addEvent } = useEventStore();
  const { activeConversationId } = useActiveConversationStore();
  const inputValue = useChatInputStore((state) => state.inputValue);
  const setInputValue = useChatInputStore((state) => state.setInputValue);
  const clearAll = useChatInputStore((state) => state.clearAll);
  const requestFocus = useChatInputStore((state) => state.requestFocus);
  const currentEvents = activeConversationId
    ? events[activeConversationId] || []
    : [];
  const { interrupt, isBusy, beginPendingConversation, handleSendMessage } =
    useSendMessage();
  const streamingMessages = useEventStreamStore((state) =>
    activeConversationId ? state.streaming[activeConversationId] : undefined,
  );

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

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
    },
    [setInputValue],
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex px-2 justify-between">
        <Button
          size="icon"
          onClick={() => {
            beginPendingConversation();
            clearAll();
            requestFocus();
          }}
        >
          <PenSquare />
        </Button>
        <ChatToolbar />
      </div>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <ChatScrollArea
          events={currentEvents}
          activeConversationId={activeConversationId}
          streamingMessages={streamingMessages}
        />
        <ChatCompose
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onSendMessage={handleSendMessage}
          onStopStreaming={() =>
            activeConversationId && interrupt(activeConversationId)
          }
          isBusy={isBusy}
        />
      </div>
    </div>
  );
}
