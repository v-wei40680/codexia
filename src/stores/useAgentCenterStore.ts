import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgentCenterCard =
  | { kind: 'codex'; id: string; preview?: string }
  | { kind: 'cc'; id: string; preview?: string };

interface AgentCenterState {
  cards: AgentCenterCard[];
  addAgentCard: (card: AgentCenterCard) => void;
  removeCard: (card: AgentCenterCard) => void;
}

export const useAgentCenterStore = create<AgentCenterState>()(
  persist(
    (set) => ({
      cards: [],

      addAgentCard: (card) =>
        set((state) => {
          const idx = state.cards.findIndex((c) => c.kind === card.kind && c.id === card.id);
          if (idx === -1) return { cards: [...state.cards, card] };
          if (!card.preview) return {};
          const next = [...state.cards];
          next[idx] = { ...next[idx], preview: card.preview } as AgentCenterCard;
          return { cards: next };
        }),

      removeCard: (card) =>
        set((state) => ({
          cards: state.cards.filter((c) => !(c.kind === card.kind && c.id === card.id)),
        })),
    }),
    {
      name: 'agent-center-store',
      version: 1,
    }
  )
);
