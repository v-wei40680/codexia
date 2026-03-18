import { create } from 'zustand';
import type { AgentType } from './useWorkspaceStore';

interface TrayPendingState {
  pending: { kind: AgentType; text: string } | null;
  setPending: (msg: { kind: AgentType; text: string }) => void;
  clearPending: () => void;
}

export const useTrayPendingStore = create<TrayPendingState>((set) => ({
  pending: null,
  setPending: (msg) => set({ pending: msg }),
  clearPending: () => set({ pending: null }),
}));
