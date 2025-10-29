import React from "react";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

interface DeltaEventItemProps {
  type: string;
  partialContent: string;
  state: "streaming" | "done";
}

export const DeltaEventItem: React.FC<DeltaEventItemProps> = ({
  type,
  partialContent,
  state,
}) => {
  // Only render if streaming (done messages will be shown via EventItem)
  if (state === "done") {
    return null;
  }

  if (type === "agent_message") {
    return (
      <div className="group space-y-1">
        <MarkdownRenderer content={partialContent} />
      </div>
    );
  }

  if (type === "agent_reasoning" || type === "agent_reasoning_raw_content") {
    return (
      <span className="flex">
        ✨<MarkdownRenderer content={partialContent} />
      </span>
    );
  }

  return null;
};
