import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ConversationSummary } from "@/bindings/ConversationSummary";

interface ConversationListState {
  conversationsByCwd: Record<string, ConversationSummary[]>;
  conversationIndex: Record<string, string>;
  favoriteConversationIdsByCwd: Record<string, string[]>;
}

interface ConversationListActions {
  addConversation: (cwd: string, summary: ConversationSummary) => Promise<void>;
  updateConversationPreview: (conversationId: string, preview: string) => void;
  removeConversation: (conversationId: string) => Promise<void>;
  setFavorite: (conversationId: string, isFavorite: boolean) => Promise<void>;
  toggleFavorite: (conversationId: string) => Promise<void>;
  reset: () => void;
}

async function syncCacheToBackend(cwd: string) {
  const state = useConversationListStore.getState();
  const conversations = state.conversationsByCwd[cwd] ?? [];
  await invoke("write_project_cache", { projectPath: cwd, sessions: conversations, favorites: [] });
}

export const useConversationListStore = create<
  ConversationListState & ConversationListActions
>()(
  (set, get) => ({
    conversationsByCwd: {},
    conversationIndex: {},
    favoriteConversationIdsByCwd: {},

    addConversation: async (cwd, summary) => {
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
      });
      await syncCacheToBackend(cwd);
    },

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

    removeConversation: async (conversationId) => {
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
      await syncCacheToBackend(cwd);
    },

    setFavorite: async (conversationId, isFavorite) => {
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
      await syncCacheToBackend(cwd);
    },

    toggleFavorite: async (conversationId) => {
      const cwd = get().conversationIndex[conversationId];
      if (!cwd) return;
      const favorites = get().favoriteConversationIdsByCwd[cwd] ?? [];
      const isFavorite = favorites.includes(conversationId);
      await get().setFavorite(conversationId, !isFavorite);
    },

    reset: () =>
      set({
        conversationsByCwd: {},
        conversationIndex: {},
        favoriteConversationIdsByCwd: {},
      }),
  }),
);

// Helper to load project sessions from backend and update the store
export async function loadProjectSessions(cwd: string) {
  const { sessions, favorites } = await invoke("load_project_sessions", { projectPath: cwd }) as { sessions: any[], favorites: string[] };
  // Reset the store
  useConversationListStore.getState().reset();
  // Add each conversation/session
  for (const summary of sessions) {
    await useConversationListStore.getState().addConversation(cwd, summary);
  }
  // Set favorites for cwd
  useConversationListStore.setState(state => ({
    favoriteConversationIdsByCwd: {
      ...state.favoriteConversationIdsByCwd,
      [cwd]: favorites ?? [],
    }
  }));
}