import { AgentReasoningDeltaEvent } from "@/bindings/AgentReasoningDeltaEvent";
import { useState } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";
import { AgentReasoningRawContentDeltaEvent } from "@/bindings/AgentReasoningRawContentDeltaEvent";

interface ReasoningSection {
  id: string;
  content: string;
  isStreaming: boolean;
}

export function useReasoningStream(conversationId: string | null) {
  const [sections, setSections] = useState<ReasoningSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  const handleReasoningDelta = (
    event: AgentReasoningDeltaEvent | AgentReasoningRawContentDeltaEvent,
  ) => {
    setSections((prev) => {
      const lastSection = prev[prev.length - 1];
      if (lastSection && lastSection.isStreaming) {
        // Append to existing streaming section
        return prev.map((section) =>
          section.id === lastSection.id
            ? { ...section, content: section.content + event.delta }
            : section,
        );
      } else {
        // Create new section
        const newId = v4();
        setCurrentSectionId(newId);
        return [
          ...prev,
          {
            id: newId,
            content: event.delta,
            isStreaming: true,
          },
        ];
      }
    });
  };

  const handleReasoningSectionBreak = () => {
    setSections((prev) => {
      const lastSection = prev[prev.length - 1];
      if (lastSection && lastSection.isStreaming) {
        return prev.map((section) =>
          section.id === lastSection.id
            ? { ...section, isStreaming: false }
            : section,
        );
      }
      return prev;
    });
    console.log(currentSectionId);
    setCurrentSectionId(null);
  };

  useConversationEvents(conversationId, {
    onAgentReasoningDelta: handleReasoningDelta,
    onAgentReasoningSectionBreak: handleReasoningSectionBreak,
  });

  return { sections };
}
