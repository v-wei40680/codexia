import { create } from "zustand";
import { invoke } from "@/lib/tauri-proxy";
import type { ConversationSummary } from "@/bindings/ConversationSummary";

interface ConversationListState {
  conversationsByCwd: Record<string, ConversationSummary[]>;
  conversationIndex: Record<string, string>;
  favoriteConversationIdsByCwd: Record<string, string[]>;
  loadedAllByCwd: Record<string, boolean>;
  hasMoreByCwd: Record<string, boolean>;
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
  const favorites = state.favoriteConversationIdsByCwd[cwd] ?? [];
  await invoke("write_project_cache", { 
    projectPath: cwd, 
    sessions: conversations, 
    favorites 
  });
}

export const useConversationListStore = create<
  ConversationListState & ConversationListActions
>()(
  (set, get) => ({
    conversationsByCwd: {},
    conversationIndex: {},
    favoriteConversationIdsByCwd: {},
    loadedAllByCwd: {},
    hasMoreByCwd: {},

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
        const mergedConversation =
          existingItem === null
            ? summaryWithTimestamp
            : { ...existingItem, ...summaryWithTimestamp };
        const nextList = [
          mergedConversation,
          ...existingList.filter(
            (item) => item.conversationId !== summaryWithTimestamp.conversationId,
          ),
        ];

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
        loadedAllByCwd: {},
        hasMoreByCwd: {},
      }),
  }),
);

// Helper to load project sessions from backend and update the store
export async function loadProjectSessions(cwd: string, loadAll: boolean = false) {
  let result: { sessions?: any[]; favorites?: string[]; last10sessions?: any[] } | null = null;
  try {
    result = (await invoke("load_project_sessions", { projectPath: cwd })) as {
      sessions?: any[];
      favorites?: string[];
      last10sessions?: any[];
    };
  } catch (_) {
    // Swallow and fall back to empty lists
    result = { sessions: [], favorites: [], last10sessions: [] };
  }

  const sessions = result?.sessions ?? [];
  const favorites = result?.favorites ?? [];
  const last10sessions = result?.last10sessions ?? sessions.slice(0, 10);
  
  // Reset the store
  useConversationListStore.getState().reset();
  
  // First set the favorites and flags before adding items
  useConversationListStore.setState(state => ({
    favoriteConversationIdsByCwd: {
      ...state.favoriteConversationIdsByCwd,
      [cwd]: favorites ?? [],
    },
    loadedAllByCwd: {
      ...state.loadedAllByCwd,
      [cwd]: !!loadAll,
    },
    hasMoreByCwd: {
      ...state.hasMoreByCwd,
      [cwd]: (sessions?.length ?? 0) > (last10sessions?.length ?? 0),
    },
  }));

  // Then add each conversation/session (this will sync with the correct favorites)
  if (loadAll) {
    for (const summary of sessions) {
      await useConversationListStore.getState().addConversation(cwd, summary);
    }
  } else {
    for (const summary of last10sessions) {
      await useConversationListStore.getState().addConversation(cwd, summary);
    }
  }
}
