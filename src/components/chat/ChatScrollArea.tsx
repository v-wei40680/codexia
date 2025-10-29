import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventItem } from "@/components/events/EventItem";
import DeltaEventLog from "../DeltaEventLog";
import type { CodexEvent } from "@/types/chat";

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

type StreamingMessages = Record<
  string,
  { partialContent: string; state: "streaming" | "done"; type?: string }
>;

interface ChatScrollAreaProps {
  events: CodexEvent[];
  activeConversationId?: string | null;
  streamingMessages?: StreamingMessages;
}

export function ChatScrollArea({
  events,
  activeConversationId,
  streamingMessages,
}: ChatScrollAreaProps) {
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const autoScrollRef = useRef(isAutoScrollEnabled);
  const manualOverrideRef = useRef(isManualOverride);

  const handleScrollToBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    manualOverrideRef.current = false;
    autoScrollRef.current = true;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    setIsManualOverride(false);
    setIsAutoScrollEnabled(true);
  }, []);

  const handleScrollToTop = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    manualOverrideRef.current = true;
    autoScrollRef.current = false;
    viewport.scrollTo({ top: 0, behavior: "smooth" });
    setIsManualOverride(true);
    setIsAutoScrollEnabled(false);
  }, []);

  useEffect(() => {
    autoScrollRef.current = isAutoScrollEnabled;
  }, [isAutoScrollEnabled]);

  useEffect(() => {
    manualOverrideRef.current = isManualOverride;
  }, [isManualOverride]);

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
      if (shouldStick) {
        if (manualOverrideRef.current && viewport.scrollTop === 0) {
          return;
        }
        if (manualOverrideRef.current && viewport.scrollTop > 0) {
          manualOverrideRef.current = false;
          setIsManualOverride(false);
        }
        if (!autoScrollRef.current) {
          autoScrollRef.current = true;
          setIsAutoScrollEnabled(true);
        }
      } else {
        if (autoScrollRef.current) {
          autoScrollRef.current = false;
          setIsAutoScrollEnabled(false);
        }
        if (!manualOverrideRef.current) {
          manualOverrideRef.current = true;
          setIsManualOverride(true);
        }
      }
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
    autoScrollRef.current = true;
    manualOverrideRef.current = false;
    setIsAutoScrollEnabled(true);
    setIsManualOverride(false);
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

    if (!hasActiveStream) {
      return;
    }

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: hasActiveStream ? "auto" : "smooth",
    });
  }, [activeConversationId, events, isAutoScrollEnabled, streamingMessages]);

  return (
    <div className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div ref={scrollContentRef} className="space-y-4 p-4">
          {events.map((event) => (
            <EventItem
              key={getEventKey(event)}
              event={event}
              conversationId={event.payload.params.conversationId}
            />
          ))}
          <DeltaEventLog />
        </div>
      </ScrollArea>
      <div className="pointer-events-none absolute right-2 top-2 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleScrollToTop}
          className="pointer-events-auto shadow-md"
        >
          <ArrowUp />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleScrollToBottom}
          className="pointer-events-auto shadow-md"
        >
          <ArrowDown />
        </Button>
      </div>
    </div>
  );
}
