import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

// Card limits by tier:
//   not logged in   → 2
//   logged in, free → 3
//   pro subscriber  → unlimited
export const AGENT_LIMITS = {
  guest: 2,
  free: 3,
  pro: Infinity,
} as const;

export const useAgentLimit = () => {
  const { user, loading: authLoading } = useAuth();
  const { tier, loading: subLoading } = useSubscription(user);

  const loading = authLoading || subLoading;

  let maxCards: number;
  if (!user) {
    maxCards = AGENT_LIMITS.guest;
  } else if (tier === 'pro') {
    maxCards = AGENT_LIMITS.pro;
  } else {
    maxCards = AGENT_LIMITS.free;
  }

  const isPro = tier === 'pro';

  return { maxCards, isPro, loading, user };
};
