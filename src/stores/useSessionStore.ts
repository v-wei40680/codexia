import { create } from "zustand";

interface SessionState {
  isBusy: boolean;
}

interface SessionActions {
  setIsBusy: (value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    isBusy: false,
    setIsBusy: (value) => set({ isBusy: value }),
    reset: () => set({ isBusy: false }),
  }),
);
