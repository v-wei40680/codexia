import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { StreamingMessage } from "@/stores/useEventStreamStore";
import { Brain } from "lucide-react";

interface DeltaEventItemProps {
  message: StreamingMessage;
}

export function DeltaEventItem({ message }: DeltaEventItemProps) {
  if (message.status !== "streaming") {
    return null;
  }

  const { type, partialContent } = message;
  const lowerType = type.toLowerCase();

  if (lowerType.startsWith("agent_message")) {
    return (
      <div className="group space-y-1">
        <MarkdownRenderer content={partialContent} />
      </div>
    );
  }

  const isReasoning =
    lowerType.startsWith("agent_reasoning") || lowerType.startsWith("reasoning");

  if (isReasoning) {
    return (
      <span className="flex items-start gap-2 rounded-md bg-muted p-3 text-sm">
        <Brain className="h-4 w-4 shrink-0" />
        <MarkdownRenderer content={partialContent} />
      </span>
    );
  }

  return null;
}
