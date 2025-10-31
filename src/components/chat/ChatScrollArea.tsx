import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventItem } from "@/components/events/EventItem";
import type { CodexEvent } from "@/types/chat";
import { DeltaEventItem } from "@/components/events/DeltaEventItem";
import { StreamingMessage } from "@/stores/useEventStreamStore";
import { useChatScroll } from "@/hooks/useChatScroll";

interface ChatScrollAreaProps {
  events: CodexEvent[];
  activeConversationId?: string | null;
  streamingMessages?: Record<string, StreamingMessage>;
}

export function ChatScrollArea({
  events,
  activeConversationId,
  streamingMessages,
}: ChatScrollAreaProps) {
  const hasActiveStream =
    streamingMessages &&
    Object.values(streamingMessages).some(
      (message) => message.status === "streaming",
    );

  const { scrollContentRef, scrollToBottom, scrollToTop } = useChatScroll({
    activeConversationId,
    hasActiveStream: Boolean(hasActiveStream),
  });

  const streamEntries: Array<[string, StreamingMessage]> = streamingMessages
    ? Object.entries(streamingMessages).filter(
        ([, message]) => message.status === "streaming",
      )
    : [];
  const eventKeyCounts = new Map<string, number>();
  const streamKeyCounts = new Map<string, number>();

  return (
    <div className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div ref={scrollContentRef} className="space-y-4 p-4">
          {events.map((event) => {
            const { conversationId, id, msg } = event.payload.params;
            if (msg.type.endsWith("_delta")) {
              return null;
            }
            const sourceTag = event.source ?? "live";
            const baseKey = `${conversationId}:${id}:${msg.type}:${sourceTag}`;
            const occurrence = eventKeyCounts.get(baseKey) ?? 0;
            eventKeyCounts.set(baseKey, occurrence + 1);
            const eventKey = `${baseKey}#${occurrence}`;
            return (
              <div key={`event-${eventKey}`} className="space-y-1">
                <EventItem event={event} conversationId={conversationId} />
                {import.meta.env.DEV &&
                <p className="text-xs text-muted-foreground">{msg.type}</p>}
              </div>
            );
          })}
          {streamEntries.map(([key, message]) => {
            const occurrence = streamKeyCounts.get(key) ?? 0;
            streamKeyCounts.set(key, occurrence + 1);
            const streamKey = `${key}#${occurrence}`;
            return (
              <div key={`stream-${streamKey}`} className="space-y-1">
                <DeltaEventItem message={message} />
                {import.meta.env.DEV &&
                <p className="text-xs text-muted-foreground">{message.type}</p>}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="pointer-events-none absolute right-2 top-2 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollToTop}
          className="pointer-events-auto shadow-md"
        >
          <ArrowUp />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={scrollToBottom}
          className="pointer-events-auto shadow-md"
        >
          <ArrowDown />
        </Button>
      </div>
    </div>
  );
}
