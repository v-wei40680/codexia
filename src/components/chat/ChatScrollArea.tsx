import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EventItem } from "@/components/events/EventItem";
import type { CodexEvent } from "@/types/chat";
import { DELTA_EVENT_TYPES } from "@/types/chat";
import { useChatScroll } from "@/hooks/useChatScroll";
import { ScrollButtons } from "./actions/ScrollButtons";

// Build a stable key for React list rendering. Avoid index-based keys.
const getEventKey = (event: CodexEvent): string => {
  const { id, msg } = event.payload.params;

  if (event.meta?.streamKey) {
    const startedAt = event.meta.streamStartedAt ?? "pending";
    return `${event.meta.streamKey}-${startedAt}`;
  }

  if ("item_id" in msg) {
    return `${msg.item_id}-${msg.type}`;
  }

  if ("call_id" in msg) {
    return `${msg.call_id}-${msg.type}`;
  }

  // Fallback: include event id and turn id to ensure stability
  return `${event.id}-${id}-${msg.type}`;
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

  // Sort by numeric turn id (params.id is an increasing string).
  // Within the same turn id, keep original insertion order to avoid jitter.
  const sortedEvents = useMemo(() => {
    const priority = (t: string): number => {
      if (t === "task_started") return 0;
      if (t === "user_message") return 1;
      if (t === "task_complete") return 100;
      return 10;
    };

    return events
      .map((e, i) => ({ e, i }))
      .sort((a, b) => {
        const aid = Number(a.e.payload.params.id);
        const bid = Number(b.e.payload.params.id);
        const aNum = Number.isFinite(aid);
        const bNum = Number.isFinite(bid);
        if (aNum && bNum && aid !== bid) return aid - bid;
        if (!aNum || !bNum) {
          const as = a.e.payload.params.id ?? "";
          const bs = b.e.payload.params.id ?? "";
          if (as !== bs) return as.localeCompare(bs);
        }
        const at = a.e.payload.params.msg.type;
        const bt = b.e.payload.params.msg.type;
        const ap = priority(at);
        const bp = priority(bt);
        if (ap !== bp) return ap - bp;
        // Stable within the same turn
        return a.i - b.i;
      })
      .map(({ e }) => e);
  }, [events]);

  const renderEvents = useMemo(() => {
    return sortedEvents.filter((e) => {
      const t = e.payload.params.msg.type;
      if (DELTA_EVENT_TYPES.has(t)) return false;
      if (t === "exec_command_output_delta") return false;
      return true;
    });
  }, [sortedEvents]);

  return (
    <div className="relative flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div ref={scrollContentRef} className="space-y-4 p-4">
          {renderEvents.map((event) => {
            const { conversationId, msg } = event.payload.params;
            const key = getEventKey(event);
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
