import { create } from "zustand";

interface SessionState {
  isInitializing: boolean;
  isBusy: boolean;
}

interface SessionActions {
  setIsInitializing: (value: boolean) => void;
  setIsBusy: (value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    isInitializing: false,
    isBusy: false,
    setIsInitializing: (value) => set({ isInitializing: value }),
    setIsBusy: (value) => set({ isBusy: value }),
    reset: () => set({ isInitializing: false, isBusy: false }),
  }),
);
