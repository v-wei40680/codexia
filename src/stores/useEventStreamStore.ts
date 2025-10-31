import { create } from "zustand";
import type { CodexEvent } from "@/types/chat";

export interface StreamingMessage {
  payloadId: string;
  type: string;
  partialContent: string;
  eventId: number;
  updatedAt: number;
  status: "streaming";
}

interface StreamState {
  streaming: Record<string, Record<string, StreamingMessage>>;
  pendingAgentMessages: Record<string, CodexEvent[]>;
  appendDelta: (event: CodexEvent) => void;
  queueAgentMessage: (event: CodexEvent) => void;
  finalizeConversation: (conversationId: string) => CodexEvent[];
  clearConversation: (conversationId: string) => void;
}

export const useEventStreamStore = create<StreamState>((set) => ({
  streaming: {},
  pendingAgentMessages: {},
  appendDelta: (event) => {
    const { msg, conversationId, id } = event.payload.params;
    if (!msg.type.endsWith("_delta")) {
      return;
    }

    const deltaContainer = msg as { delta?: unknown };
    const deltaText =
      typeof deltaContainer.delta === "string" ? deltaContainer.delta : "";
    const timestamp = event.createdAt ?? Date.now();

    const streamKey = `${id}:${msg.type}`;

    set((state) => {
      const conversationStream = state.streaming[conversationId] ?? {};
      const previous = conversationStream[streamKey];
      const nextEntry: StreamingMessage = {
        payloadId: id,
        type: msg.type,
        partialContent: (previous?.partialContent ?? "") + deltaText,
        eventId: previous
          ? Math.max(previous.eventId, event.id)
          : event.id,
        updatedAt: timestamp,
        status: "streaming",
      };

      return {
        streaming: {
          ...state.streaming,
          [conversationId]: {
            ...conversationStream,
            [streamKey]: nextEntry,
          },
        },
      };
    });
  },
  queueAgentMessage: (event) => {
    const { conversationId } = event.payload.params;
    set((state) => {
      const existing = state.pendingAgentMessages[conversationId] ?? [];
      return {
        pendingAgentMessages: {
          ...state.pendingAgentMessages,
          [conversationId]: [...existing, event],
        },
      };
    });
  },
  finalizeConversation: (conversationId) => {
    let queued: CodexEvent[] = [];
    set((state) => {
      queued = state.pendingAgentMessages[conversationId] ?? [];
      if (!state.streaming[conversationId] && queued.length === 0) {
        return state;
      }

      const nextStreaming = { ...state.streaming };
      const nextPending = { ...state.pendingAgentMessages };
      delete nextStreaming[conversationId];
      delete nextPending[conversationId];

      return {
        streaming: nextStreaming,
        pendingAgentMessages: nextPending,
      };
    });
    return queued;
  },
  clearConversation: (conversationId) => {
    set((state) => {
      if (
        !state.streaming[conversationId] &&
        !state.pendingAgentMessages[conversationId]
      ) {
        return state;
      }

      const nextStreaming = { ...state.streaming };
      const nextPending = { ...state.pendingAgentMessages };
      delete nextStreaming[conversationId];
      delete nextPending[conversationId];

      return {
        streaming: nextStreaming,
        pendingAgentMessages: nextPending,
      };
    });
  },
}));
