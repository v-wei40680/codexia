import { ScrollArea } from "@/components/ui/scroll-area";
import { EventItem } from "@/components/events/EventItem";
import type { CodexEvent } from "@/types/chat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { v4 } from "uuid";
import { ScrollButtons } from "./ScrollButtons";

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
          {events.map((event) => {
            const { conversationId, msg } = event.payload.params;
            if (msg.type.endsWith("_delta")) {
              return null;
            }
            return (
              <div key={v4()} className="space-y-1">
                <EventItem event={event} conversationId={conversationId} />
                {import.meta.env.DEV &&
                <p className="text-xs text-muted-foreground">{msg.type}</p>}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <ScrollButtons scrollToTop={scrollToTop} scrollToBottom={scrollToBottom} />
    </div>
  );
}
