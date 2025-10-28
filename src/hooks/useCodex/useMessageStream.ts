import { AgentMessageDeltaEvent } from "@/bindings/AgentMessageDeltaEvent";
import { AgentMessageEvent } from "@/bindings/AgentMessageEvent";
import { UserMessageEvent } from "@/bindings/UserMessageEvent";
import { useEffect, useState } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  images?: string[];
  timestamp: number;
  isStreaming?: boolean;
}

export function useMessageStream(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setMessages([]);
    setCurrentStreamingId(null);
  }, [conversationId]);

  // Handle incremental updates
  const handleAgentMessageDelta = (event: AgentMessageDeltaEvent) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.isStreaming && lastMessage.role === "agent") {
        // Update existing streaming message
        return prev.map((msg) =>
          msg.id === lastMessage.id
            ? { ...msg, content: msg.content + event.delta }
            : msg,
        );
      } else {
        // Create new streaming message
        const newId = v4();
        setCurrentStreamingId(newId);
        return [
          ...prev,
          { 
            id: newId,
            role: "agent",
            content: event.delta,
            timestamp: Date.now(),
            isStreaming: true,
          },
        ];
      }
    });
  };

  const handleAgentMessage = (_event: AgentMessageEvent) => {
    if (currentStreamingId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === currentStreamingId ? { ...msg, isStreaming: false } : msg,
        ),
      );
      setCurrentStreamingId(null);
    }
  };

  // User message
  const handleUserMessage = (event: UserMessageEvent) => {
    setMessages((prev) => [
      ...prev,
      {
        id: v4(),
        role: "user",
        content: event.message,
        images: event.images ?? undefined,
        timestamp: Date.now(),
      },
    ]);
  };

  useConversationEvents(conversationId, {
    onAgentMessageDelta: handleAgentMessageDelta,
    onAgentMessage: handleAgentMessage,
    onUserMessage: handleUserMessage,
  });

  return { messages };
}
