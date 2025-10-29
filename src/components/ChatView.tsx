import { useCallback, useEffect, useRef, useState } from "react";
import { useConversation, useSendMessage } from "@/hooks/useCodex";
import { Button } from "./ui/button";
import { type CodexEvent } from "@/types/chat";
import { ChatCompose } from "./chat/ChatCompose";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { PenSquare } from "lucide-react";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { useConversationEvents } from "@/hooks/useCodex/useConversationEvents";
import { useEventStreamStore } from "@/stores/useEventStreamStore";
import { useEventStore } from "@/stores/useEventStore";
import { EventItem } from "@/components/events/EventItem";
import DeltaEventLog from "./DeltaEventLog";
import { ChatToolbar } from "./layout/ChatToolBar";
import { useChatInputStore } from "@/stores/chatInputStore";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { interrupt, isSending, beginPendingConversation, handleSendMessage } =
    useSendMessage();
  const streamingMessages = useEventStreamStore((state) =>
    activeConversationId ? state.streaming[activeConversationId] : undefined,
  );
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const bottomMarkerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

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

  useEffect(() => {
    const content = scrollContentRef.current;
    if (!content) {
      return;
    }
    const viewport = content.closest(
      "[data-slot='scroll-area-viewport']",
    ) as HTMLElement | null;
    if (!viewport) {
      return;
    }

    viewportRef.current = viewport;

    const handleScroll = () => {
      const distanceToBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const shouldStick = distanceToBottom <= 64;
      setIsAutoScrollEnabled((prev) =>
        prev !== shouldStick ? shouldStick : prev,
      );
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
      if (viewportRef.current === viewport) {
        viewportRef.current = null;
      }
    };
  }, [activeConversationId]);

  useEffect(() => {
    setIsAutoScrollEnabled(true);
  }, [activeConversationId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    if (!isAutoScrollEnabled) {
      return;
    }

    const hasActiveStream =
      streamingMessages &&
      Object.values(streamingMessages).some(
        (message) => message.state === "streaming",
      );

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: hasActiveStream ? "auto" : "smooth",
    });
  }, [
    activeConversationId,
    currentEvents,
    isAutoScrollEnabled,
    streamingMessages,
  ]);

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
        <ScrollArea className="flex-1 min-h-0">
          <div ref={scrollContentRef} className="space-y-4 p-4">
            {currentEvents.map((ev) => (
              <EventItem
                key={getEventKey(ev)}
                event={ev}
                conversationId={ev.payload.params.conversationId}
              />
            ))}
            <DeltaEventLog />
            <div ref={bottomMarkerRef} />
          </div>
        </ScrollArea>

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
