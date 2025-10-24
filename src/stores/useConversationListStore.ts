import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConversationSummary } from "@/bindings/ConversationSummary";

interface ConversationListState {
  conversationsByCwd: Record<string, ConversationSummary[]>;
  conversationIndex: Record<string, string>;
  favoriteConversationIdsByCwd: Record<string, string[]>;
}

interface ConversationListActions {
  addConversation: (cwd: string, summary: ConversationSummary) => void;
  updateConversationPreview: (conversationId: string, preview: string) => void;
  removeConversation: (conversationId: string) => void;
  setFavorite: (conversationId: string, isFavorite: boolean) => void;
  toggleFavorite: (conversationId: string) => void;
  reset: () => void;
}

export const useConversationListStore = create<
  ConversationListState & ConversationListActions
>()(
  persist(
    (set, get) => ({
      conversationsByCwd: {},
      conversationIndex: {},
      favoriteConversationIdsByCwd: {},

      addConversation: (cwd, summary) =>
        set((state) => {
          const existingList = state.conversationsByCwd[cwd] ?? [];
          const index = existingList.findIndex(
            (item) => item.conversationId === summary.conversationId,
          );
          const existingItem = index >= 0 ? existingList[index] : null;
          const summaryWithTimestamp: ConversationSummary = {
            ...summary,
            timestamp:
              summary.timestamp ??
              existingItem?.timestamp ??
              new Date().toISOString(),
          };
          const nextList =
            index >= 0
              ? existingList.map((item, idx) =>
                  idx === index ? { ...item, ...summaryWithTimestamp } : item,
                )
              : [...existingList, summaryWithTimestamp];

          return {
            conversationsByCwd: {
              ...state.conversationsByCwd,
              [cwd]: nextList,
            },
            conversationIndex: {
              ...state.conversationIndex,
              [summaryWithTimestamp.conversationId]: cwd,
            },
          };
        }),

      updateConversationPreview: (conversationId, preview) => {
        const cwd = get().conversationIndex[conversationId];
        if (!cwd) return;
        set((state) => {
          const list = state.conversationsByCwd[cwd] ?? [];
          const nextList = list.map((item) =>
            item.conversationId === conversationId
              ? { ...item, preview }
              : item,
          );
          return {
            conversationsByCwd: {
              ...state.conversationsByCwd,
              [cwd]: nextList,
            },
          };
        });
      },

      removeConversation: (conversationId) => {
        const cwd = get().conversationIndex[conversationId];
        if (!cwd) return;
        set((state) => {
          const list = state.conversationsByCwd[cwd] ?? [];
          const nextList = list.filter(
            (item) => item.conversationId !== conversationId,
          );
          const nextIndex = { ...state.conversationIndex };
          delete nextIndex[conversationId];
          const favorites = state.favoriteConversationIdsByCwd[cwd] ?? [];
          const nextFavorites = favorites.filter((id) => id !== conversationId);
          const favoriteConversationIdsByCwd = {
            ...state.favoriteConversationIdsByCwd,
            [cwd]: nextFavorites,
          };
          if (nextFavorites.length === 0) {
            delete favoriteConversationIdsByCwd[cwd];
          }

          return {
            conversationsByCwd: {
              ...state.conversationsByCwd,
              [cwd]: nextList,
            },
            conversationIndex: nextIndex,
            favoriteConversationIdsByCwd,
          };
        });
      },

      setFavorite: (conversationId, isFavorite) => {
        const cwd = get().conversationIndex[conversationId];
        if (!cwd) return;
        set((state) => {
          const favorites = state.favoriteConversationIdsByCwd[cwd] ?? [];
          const hasFavorite = favorites.includes(conversationId);

          if (isFavorite && hasFavorite) {
            return {};
          }

          if (!isFavorite && !hasFavorite) {
            return {};
          }

          const nextFavorites = isFavorite
            ? [...favorites, conversationId]
            : favorites.filter((id) => id !== conversationId);

          const favoriteConversationIdsByCwd = {
            ...state.favoriteConversationIdsByCwd,
            [cwd]: nextFavorites,
          };

          if (nextFavorites.length === 0) {
            delete favoriteConversationIdsByCwd[cwd];
          }

          return { favoriteConversationIdsByCwd };
        });
      },

      toggleFavorite: (conversationId) => {
        const cwd = get().conversationIndex[conversationId];
        if (!cwd) return;
        const favorites = get().favoriteConversationIdsByCwd[cwd] ?? [];
        const isFavorite = favorites.includes(conversationId);
        get().setFavorite(conversationId, !isFavorite);
      },

      reset: () =>
        set({
          conversationsByCwd: {},
          conversationIndex: {},
          favoriteConversationIdsByCwd: {},
        }),
    }),
    {
      name: "conversation-list",
    },
  ),
);
