import { create } from "zustand";

interface ReasoningState {
  activeReasoningId: Record<string, string | undefined>;
  setActiveReasoningId: (conversationId: string, reasoningId: string | undefined) => void;
  clearActiveReasoningId: (conversationId: string) => void;
}

export const useReasoningStore = create<ReasoningState>((set) => ({
  activeReasoningId: {},
  setActiveReasoningId: (conversationId, reasoningId) =>
    set((state) => ({
      activeReasoningId: {
        ...state.activeReasoningId,
        [conversationId]: reasoningId,
      },
    })),
  clearActiveReasoningId: (conversationId) =>
    set((state) => {
      const newActiveReasoningId = { ...state.activeReasoningId };
      delete newActiveReasoningId[conversationId];
      return { activeReasoningId: newActiveReasoningId };
    }),
}));
