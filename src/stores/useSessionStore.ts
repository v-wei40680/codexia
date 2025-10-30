import { create } from "zustand";

interface SessionState {
  isInitializing: boolean;
  isBusy: boolean;
  activeSessionConversationId: string | null;
}

interface SessionActions {
  setIsInitializing: (value: boolean) => void;
  setActiveSessionConversationId: (value: string) => void;
  setIsBusy: (value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    isInitializing: false,
    isBusy: false,
    activeSessionConversationId: null,
    setIsInitializing: (value) => set({ isInitializing: value }),
    setActiveSessionConversationId: (value) => set({ activeSessionConversationId: value }),
    setIsBusy: (value) => set({ isBusy: value }),
    reset: () => set({ isInitializing: false, isBusy: false }),
  }),
);
