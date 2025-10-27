import { AgentReasoningDeltaEvent } from "@/bindings/AgentReasoningDeltaEvent";
import { useState } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";

interface ReasoningSection {
  id: string;
  content: string;
  isStreaming: boolean;
}

export function useReasoningStream(conversationId: string | null) {
  const [sections, setSections] = useState<ReasoningSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  const handleReasoningDelta = (event: AgentReasoningDeltaEvent) => {
    setSections((prev) => {
      if (currentSectionId) {
        return prev.map((section) =>
          section.id === currentSectionId
            ? { ...section, content: section.content + event.delta }
            : section,
        );
      } else {
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
    if (currentSectionId) {
      setSections((prev) =>
        prev.map((section) =>
          section.id === currentSectionId
            ? { ...section, isStreaming: false }
            : section,
        ),
      );
      setCurrentSectionId(null);
    }
  };

  useConversationEvents(conversationId, {
    onAgentReasoningDelta: handleReasoningDelta,
    onAgentReasoningSectionBreak: handleReasoningSectionBreak,
  });

  return { sections };
}
