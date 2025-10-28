import { useState, useEffect } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";
import { CodexEvent } from "@/types/chat";

interface ReasoningSection {
  id: string;
  content: string;
  isStreaming: boolean;
}

export function useReasoningStream(conversationId: string | null) {
  const [sections, setSections] = useState<ReasoningSection[]>([]);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Reset sections when conversationId changes
  useEffect(() => {
    setSections([]);
    setCurrentSectionId(null);
  }, [conversationId]);

  const handleReasoningDelta = (
    event: CodexEvent
  ) => {
    const {msg} = event.payload.params
    if (msg.type !== "agent_reasoning_delta" && msg.type !== "agent_reasoning_raw_content_delta") return;
    setSections((prev) => {
      const lastSection = prev[prev.length - 1];
      if (lastSection && lastSection.isStreaming) {
        // Append to existing streaming section
        return prev.map((section) =>
          section.id === lastSection.id
            ? { ...section, content: section.content + msg.delta }
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
            content: msg.delta,
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
