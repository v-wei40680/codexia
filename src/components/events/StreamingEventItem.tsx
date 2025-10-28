import { memo } from "react";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { useEventStreamStore } from "@/stores/useEventStreamStore";
import { CodexEvent } from "@/types/chat";

export const StreamingEventItem = memo(function StreamingEventItem({
  event,
}: {
  event: CodexEvent;
}) {
  const { id } = event.payload.params;
  const { partialContent } = useEventStreamStore((state) => {
    const entry = state.streaming[event.payload.params.conversationId]?.[id];
    return {
      partialContent: entry?.partialContent ?? "",
    };
  });

  const messageText =
    partialContent.length > 0
      ? partialContent
      : "delta" in event.payload.params.msg &&
          typeof event.payload.params.msg.delta === "string"
        ? event.payload.params.msg.delta
        : "";

  return (
    <span className="flex">
      ✨<MarkdownRenderer content={messageText} />
    </span>
  );
});
