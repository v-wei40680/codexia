import { ScrollArea } from "@/components/ui/scroll-area";
import { EventItem } from "@/components/events/EventItem";
import type { CodexEvent } from "@/types/chat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { ScrollButtons } from "./ScrollButtons";
import type { ExtendedCodexEvent } from "@/stores/useEventStore";

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
            const extEvent = event as ExtendedCodexEvent;
            // Use stableId if available, fallback to index-based key
            const key = extEvent.stableId || `${conversationId}-fallback-${index}`;
            
            return (
              <div key={key} className="space-y-1">
                <EventItem event={event} conversationId={conversationId} />
                {import.meta.env.DEV &&
                  <p className="text-xs text-muted-foreground">{msg.type}</p>
                }
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <ScrollButtons scrollToTop={scrollToTop} scrollToBottom={scrollToBottom} />
    </div>
  );
}
