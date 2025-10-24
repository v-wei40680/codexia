import React, { useMemo } from "react";
import type { EventWithId } from "@/types/chat";

interface DeltaEventLogProps {
  events: EventWithId[];
}

const collectDeltaText = (events: EventWithId[], targetType: string) =>
  events
    .filter(
      (event) =>
        event.msg.type === targetType &&
        typeof (event.msg as { delta?: unknown }).delta === "string",
    )
    .map((event) => (event.msg as { delta: string }).delta)
    .join("");

const DeltaEventLog: React.FC<DeltaEventLogProps> = ({ events }) => {
  const { messageText, reasoningText, rawReasoningText } = useMemo(() => {
    return {
      messageText: collectDeltaText(events, "agent_message_delta"),
      reasoningText: collectDeltaText(events, "agent_reasoning_delta"),
      rawReasoningText: collectDeltaText(
        events,
        "agent_reasoning_raw_content_delta",
      ),
    };
  }, [events]);

  if (!messageText && !reasoningText && !rawReasoningText) {
    return null;
  }

  return (
    <div className="space-y-3">
      {messageText && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
          {messageText}
        </p>
      )}
      {reasoningText && (
        <p className="text-xs whitespace-pre-wrap text-muted-foreground">
          {reasoningText}
        </p>
      )}
      {rawReasoningText && (
        <p className="text-xs whitespace-pre-wrap text-muted-foreground/80">
          {rawReasoningText}
        </p>
      )}
    </div>
  );
};

export default DeltaEventLog;
