import { ScrollArea } from "@/components/ui/scroll-area";
import { EventItem } from "@/components/events/EventItem";
import type { CodexEvent } from "@/types/chat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { ScrollButtons } from "./actions/ScrollButtons";

const getEventKey = (event: CodexEvent, index: number): string => {
  const { conversationId, id, msg } = event.payload.params;

  if (event.meta?.streamKey) {
    const startedAt = event.meta.streamStartedAt ?? "pending";
    return `${conversationId}-${event.meta.streamKey}-${startedAt}`;
  }

  if ("item_id" in msg && typeof msg.item_id === "string") {
    return `${conversationId}-${msg.item_id}-${msg.type}`;
  }

  if ("call_id" in msg && typeof msg.call_id === "string") {
    return `${conversationId}-${msg.call_id}-${msg.type}`;
  }

  if ("id" in msg && typeof msg.id === "string") {
    return `${conversationId}-${msg.id}-${msg.type}`;
  }

  return `${event.id}-${id}-${msg.type}-${index}`;
};

interface ChatScrollAreaProps {
  events: CodexEvent[];
  activeConversationId?: string;
}

export function ChatScrollArea({
  events,
  activeConversationId,
}: ChatScrollAreaProps) {
  const { scrollContentRef, scrollToBottom, scrollToTop } = useChatScroll({
    activeConversationId,
  });

  return (
    <div className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div ref={scrollContentRef} className="space-y-4 p-4">
          {events.map((event, index) => {
            const { conversationId, msg } = event.payload.params;
            const key = getEventKey(event, index);
            return (
              <div key={key} className="space-y-1">
                <EventItem event={event} conversationId={conversationId} />
                {import.meta.env.VITE_SHOW_EVENT_FOOTER === "true" &&
                  !["token_count", "exec_command_output_delta"].includes(
                    msg.type,
                  ) &&
                  !msg.type.startsWith("item_") && (
                    <p className="text-xs text-muted-foreground">{msg.type}</p>
                  )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <ScrollButtons
        scrollToTop={scrollToTop}
        scrollToBottom={scrollToBottom}
      />
    </div>
  );
}
