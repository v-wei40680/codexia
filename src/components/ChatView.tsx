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
import { Introduce } from "./common/Introduce";

export function ChatView() {
  useCodexApprovalRequests();
  const { status: conversationStatus } = useConversation();
  const appendDelta = useEventStreamStore((state) => state.appendDelta);
  const queueAgentMessage = useEventStreamStore(
    (state) => state.queueAgentMessage,
  );
  const finalizeConversationStream = useEventStreamStore(
    (state) => state.finalizeConversation,
  );
  const clearConversationStream = useEventStreamStore(
    (state) => state.clearConversation,
  );
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
      const msgType = event.payload.params.msg.type;
      if (msgType === "agent_message" || msgType.endsWith("_delta")) {
        return;
      }
      if (
        msgType === "turn_aborted" ||
        msgType === "error" ||
        msgType === "stream_error"
      ) {
        clearConversationStream(event.payload.params.conversationId);
      }
      upsertEvent(event);
    },
    onAgentMessageDelta: (event: CodexEvent) => {
      appendDelta(event);
    },
    onAgentReasoningDelta: (event: CodexEvent) => {
      appendDelta(event);
    },
    onAgentMessage: (event: CodexEvent) => {
      const { conversationId } = event.payload.params;
      const streamingState =
        useEventStreamStore.getState().streaming[conversationId];
      const hasActiveStream =
        streamingState && Object.keys(streamingState).length > 0;

      if (hasActiveStream) {
        queueAgentMessage(event);
        return;
      }

      const nextEvent =
        event.createdAt != null ? event : { ...event, createdAt: Date.now() };
      upsertEvent(nextEvent);
    },
    onTaskComplete: (event: CodexEvent) => {
      const { conversationId } = event.payload.params;
      const queuedMessages = finalizeConversationStream(conversationId);
      queuedMessages.forEach((queuedEvent) => {
        const nextEvent =
          queuedEvent.createdAt != null
            ? queuedEvent
            : { ...queuedEvent, createdAt: Date.now() };
        upsertEvent(nextEvent);
      });
      upsertEvent(event);
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
        {currentEvents.length > 0 ? (
          <ChatScrollArea
            events={currentEvents}
            activeConversationId={activeConversationId}
            streamingMessages={streamingMessages}
          />
        ) : (
          <Introduce />
        )}
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
