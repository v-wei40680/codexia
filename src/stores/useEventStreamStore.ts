import { create } from "zustand";
import type { CodexEvent } from "@/types/chat";

interface StreamState {
  streaming: Record<
    string,
    Record<
      string,
      { partialContent: string; state: "streaming" | "done" }
    >
  >;
  appendDelta: (event: CodexEvent) => void;
  finalizeMessage: (event: CodexEvent) => void;
}

export const useEventStreamStore = create<StreamState>((set, get) => ({
  streaming: {},
  appendDelta: (event) => {
    const { msg, conversationId, id } = event.payload.params;
    let delta = "";
    if (
      msg.type === "agent_message_delta" ||
      msg.type === "agent_reasoning_delta" ||
      msg.type === "agent_reasoning_raw_content_delta"
    ) {
      delta = msg.delta;
    }
    const s = get().streaming;
    const conversationStream = s[conversationId] ?? {};
    set({
      streaming: {
        ...s,
        [conversationId]: {
          ...conversationStream,
          [id]: {
            partialContent: (conversationStream[id]?.partialContent ?? "") + delta,
            state: "streaming",
          },
        },
      },
    });
  },
  finalizeMessage: (event) => {
    const conversationId = event.payload.params.conversationId;
    const id = event.payload.params.id;
    const s = get().streaming;
    const conversationStream = s[conversationId];
    if (conversationStream && conversationStream[id]) {
      conversationStream[id].state = "done";
      set({ streaming: { ...s, [conversationId]: { ...conversationStream } } });
    }
  },
}));
