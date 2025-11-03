import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConversationSummary } from "@/bindings/ConversationSummary";
import { useCodexStore } from "@/stores/useCodexStore";

type ConversationStateByCwd = {
  activeConversationId: string | null;
  activeConversationIds: Set<string>;
  selectConversation: ConversationSummary | null;
  hasPendingConversation: boolean;
};

interface ActiveConversationState extends ConversationStateByCwd {
  currentCwd: string;
  stateByCwd: Record<string, ConversationStateByCwd>;
}

interface ActiveConversationActions {
  setActiveConversationId: (conversationId: string | null) => void;
  setActiveConversation: (conv: ConversationSummary | null) => void;
  addActiveConversationId: (conversationId: string) => void;
  removeConversationId: (conversationId: string) => void;
  startPendingConversation: () => void;
  clearPendingConversation: () => void;
  syncWithCwd: (cwd: string) => void;
}

const createEmptyConversationState = (): ConversationStateByCwd => ({
  activeConversationId: null,
  activeConversationIds: new Set(),
  selectConversation: null,
  hasPendingConversation: false,
});

const initialCwd = useCodexStore.getState().cwd || "";

export const useActiveConversationStore = create<
  ActiveConversationState & ActiveConversationActions
>()(
  persist(
    (set) => ({
      ...createEmptyConversationState(),
      currentCwd: initialCwd,
      stateByCwd: {
        [initialCwd]: createEmptyConversationState(),
      },
      setActiveConversationId: (conversationId) =>
        set((state) => {
          const cwdKey = state.currentCwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          const updatedCwdState: ConversationStateByCwd = {
            ...cwdState,
            activeConversationId: conversationId,
            hasPendingConversation:
              conversationId === null
                ? cwdState.hasPendingConversation
                : false,
          };

          return {
            ...state,
            activeConversationId: updatedCwdState.activeConversationId,
            activeConversationIds: updatedCwdState.activeConversationIds,
            selectConversation: updatedCwdState.selectConversation,
            hasPendingConversation: updatedCwdState.hasPendingConversation,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: updatedCwdState,
            },
          };
        }),
      setActiveConversation: (conv: ConversationSummary | null) =>
        set((state) => {
          const cwdKey = state.currentCwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          const updatedCwdState: ConversationStateByCwd = {
            ...cwdState,
            selectConversation: conv,
          };

          return {
            ...state,
            selectConversation: updatedCwdState.selectConversation,
            activeConversationId: updatedCwdState.activeConversationId,
            activeConversationIds: updatedCwdState.activeConversationIds,
            hasPendingConversation: updatedCwdState.hasPendingConversation,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: updatedCwdState,
            },
          };
        }),
      addActiveConversationId: (conversationId) =>
        set((state) => {
          const cwdKey = state.currentCwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          const updatedIds = new Set(cwdState.activeConversationIds);
          updatedIds.add(conversationId);
          const updatedCwdState: ConversationStateByCwd = {
            ...cwdState,
            activeConversationIds: updatedIds,
          };

          return {
            ...state,
            activeConversationIds: updatedIds,
            activeConversationId: updatedCwdState.activeConversationId,
            selectConversation: updatedCwdState.selectConversation,
            hasPendingConversation: updatedCwdState.hasPendingConversation,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: updatedCwdState,
            },
          };
        }),
      removeConversationId: (conversationId) =>
        set((state) => {
          const cwdKey = state.currentCwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          const updatedIds = new Set(cwdState.activeConversationIds);
          updatedIds.delete(conversationId);
          const updatedCwdState: ConversationStateByCwd = {
            ...cwdState,
            activeConversationIds: updatedIds,
          };

          return {
            ...state,
            activeConversationIds: updatedIds,
            activeConversationId: updatedCwdState.activeConversationId,
            selectConversation: updatedCwdState.selectConversation,
            hasPendingConversation: updatedCwdState.hasPendingConversation,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: updatedCwdState,
            },
          };
        }),
      startPendingConversation: () =>
        set((state) => {
          const cwdKey = state.currentCwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          const updatedCwdState: ConversationStateByCwd = {
            ...cwdState,
            hasPendingConversation: true,
            activeConversationId: null,
            selectConversation: null,
          };

          return {
            ...state,
            ...updatedCwdState,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: updatedCwdState,
            },
          };
        }),
      clearPendingConversation: () =>
        set((state) => {
          const cwdKey = state.currentCwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          const updatedCwdState: ConversationStateByCwd = {
            ...cwdState,
            hasPendingConversation: false,
          };

          return {
            ...state,
            hasPendingConversation: updatedCwdState.hasPendingConversation,
            activeConversationId: updatedCwdState.activeConversationId,
            activeConversationIds: updatedCwdState.activeConversationIds,
            selectConversation: updatedCwdState.selectConversation,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: updatedCwdState,
            },
          };
        }),
      syncWithCwd: (cwd) =>
        set((state) => {
          const cwdKey = cwd || "";
          const cwdState =
            state.stateByCwd[cwdKey] ?? createEmptyConversationState();
          return {
            currentCwd: cwdKey,
            activeConversationId: cwdState.activeConversationId,
            activeConversationIds: cwdState.activeConversationIds,
            selectConversation: cwdState.selectConversation,
            hasPendingConversation: cwdState.hasPendingConversation,
            stateByCwd: {
              ...state.stateByCwd,
              [cwdKey]: cwdState,
            },
          };
        }),
    }),
    {
      name: "active-conversations",
      partialize: (state) => ({
        stateByCwd: Object.fromEntries(
          Object.entries(state.stateByCwd).map(([cwdKey, cwdState]) => [
            cwdKey,
            {
              activeConversationId: cwdState.activeConversationId,
            },
          ]),
        ),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const cwd = useCodexStore.getState().cwd || "";
          state.syncWithCwd(cwd);
        }
      },
    },
  ),
);

useActiveConversationStore.getState().syncWithCwd(initialCwd);

let lastCwd = initialCwd;

useCodexStore.subscribe((store) => {
  const nextCwd = store.cwd || "";
  if (nextCwd !== lastCwd) {
    lastCwd = nextCwd;
    useActiveConversationStore.getState().syncWithCwd(nextCwd);
  }
});
