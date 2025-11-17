import { create } from "zustand";

interface ConversationBusyState {
  isBusy: boolean;
  busyStartTime: number | null;
}

interface SessionState {
  busyByConversationId: Record<string, ConversationBusyState>;
}

interface SessionActions {
  setConversationBusy: (conversationId: string, value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    busyByConversationId: {},
    setConversationBusy: (conversationId, value) =>
      set((state) => {
        const prev = state.busyByConversationId[conversationId];
        if (!value) {
          return {
            busyByConversationId: {
              ...state.busyByConversationId,
              [conversationId]: {
                isBusy: false,
                busyStartTime: null,
              },
            },
          };
        }

        const wasBusy = prev?.isBusy ?? false;
        const busyStartTime = wasBusy ? prev?.busyStartTime ?? null : Date.now();

        return {
          busyByConversationId: {
            ...state.busyByConversationId,
            [conversationId]: {
              isBusy: true,
              busyStartTime,
            },
          },
        };
      }),
    reset: () => set({ busyByConversationId: {} }),
  }),
);
