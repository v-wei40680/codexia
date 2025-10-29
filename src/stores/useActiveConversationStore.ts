import { create } from "zustand";
import { ConversationSummary } from "@/bindings/ConversationSummary";

interface ActiveConversationState {
  activeConversationId: string | null;
  conversationIds: string[];
  selectConversation: ConversationSummary | null;
  hasPendingConversation: boolean;
}

interface ActiveConversationActions {
  setActiveConversationId: (conversationId: string | null) => void;
  setActiveConversation: (conv: ConversationSummary | null) => void;
  addConversationId: (conversationId: string) => void;
  removeConversationId: (conversationId: string) => void;
  startPendingConversation: () => void;
  clearPendingConversation: () => void;
}

export const useActiveConversationStore = create<
  ActiveConversationState & ActiveConversationActions
>()((set) => ({
  activeConversationId: null,
  conversationIds: [],
  selectConversation: null,
  hasPendingConversation: false,
  setActiveConversationId: (conversationId) =>
    set((state) => ({
      activeConversationId: conversationId,
      hasPendingConversation:
        conversationId === null
          ? state.hasPendingConversation
          : false,
    })),
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
  startPendingConversation: () =>
    set(() => ({
      hasPendingConversation: true,
      activeConversationId: null,
      selectConversation: null,
    })),
  clearPendingConversation: () =>
    set(() => ({
      hasPendingConversation: false,
    })),
}));
