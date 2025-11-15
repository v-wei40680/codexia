import { create } from "zustand";

interface SessionState {
  isBusy: boolean;
  busyStartTime: number | null;
}

interface SessionActions {
  setIsBusy: (value: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>()(
  (set) => ({
    isBusy: false,
    busyStartTime: null,
    setIsBusy: (value) =>
      set((state) => ({
        isBusy: value,
        busyStartTime:
          value && !state.isBusy ? Date.now() : value ? state.busyStartTime : null,
      })),
    reset: () => set({ isBusy: false, busyStartTime: null }),
  }),
);
