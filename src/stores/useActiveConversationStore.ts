import { create } from "zustand";
import { ConversationSummary } from "@/bindings/ConversationSummary";

interface ActiveConversationState {
  activeConversationId: string | null;
  conversationIds: string[];
  selectConversation: ConversationSummary | null;
}

interface ActiveConversationActions {
  setActiveConversationId: (conversationId: string | null) => void;
  setActiveConversation: (conv: ConversationSummary | null) => void;
  addConversationId: (conversationId: string) => void;
  removeConversationId: (conversationId: string) => void;
}

export const useActiveConversationStore = create<
  ActiveConversationState & ActiveConversationActions
>()((set) => ({
  activeConversationId: null,
  conversationIds: [],
  selectConversation: null,
  setActiveConversationId: (conversationId) =>
    set({ activeConversationId: conversationId }),
  setActiveConversation: (conv: ConversationSummary | null) =>
    set({ selectConversation: conv }),
  addConversationId: (conversationId) =>
    set((state) => ({
      conversationIds: [...state.conversationIds, conversationId],
    })),
  removeConversationId: (conversationId) =>
    set((state) => ({
      conversationIds: state.conversationIds.filter(
        (id) => id !== conversationId,
      ),
    })),
}));
