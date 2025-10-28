import React from "react";
import { useEventStreamStore } from "@/stores/useEventStreamStore";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

const DeltaEventLog: React.FC = () => {
  const { activeConversationId } = useActiveConversationStore();
  const streamingMessages = useEventStreamStore((state: any) =>
    activeConversationId ? state.streaming[activeConversationId] : undefined
  );

  if (!streamingMessages) {
    return null;
  }

  const streamingMessageList = Object.values(streamingMessages).filter(
    (msg: any) =>
      (msg.type === "agent_message" ||
        msg.type === "agent_reasoning" ||
        msg.type === "agent_reasoning_raw_content") &&
      msg.state === "streaming"
  );

  if (streamingMessageList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {streamingMessageList.map((msg: any, index: number) => {
        if (msg.type === "agent_message") {
          return (
            <div key={index} className="group space-y-1">
              <MarkdownRenderer content={msg.partialContent} />
            </div>
          );
        } else if (
          msg.type === "agent_reasoning" ||
          msg.type === "agent_reasoning_raw_content"
        ) {
          return (
            <span key={index} className="flex">
              ✨<MarkdownRenderer content={msg.partialContent} />
            </span>
          );
        }
        return null;
      })}
    </div>
  );
};

export default DeltaEventLog;