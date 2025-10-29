
import { create } from "zustand";

interface ActiveConversationState {
  activeConversationId: string | null;
  conversationIds: string[];
}

interface ActiveConversationActions {
  setActiveConversationId: (conversationId: string | null) => void;
  addConversationId: (conversationId: string) => void;
  removeConversationId: (conversationId: string) => void;
}

export const useActiveConversationStore = create<ActiveConversationState & ActiveConversationActions>()(
  (set) => ({
    activeConversationId: null,
    conversationIds: [],
    setActiveConversationId: (conversationId) =>
      set({ activeConversationId: conversationId }),
    addConversationId: (conversationId) =>
      set((state) => ({
        conversationIds: [...state.conversationIds, conversationId],
      })),
    removeConversationId: (conversationId) =>
      set((state) => ({
        conversationIds: state.conversationIds.filter((id) => id !== conversationId),
      })),
  }),
);
