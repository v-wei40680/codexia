import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import supabase from '@/lib/supabase';

export type PlanTier = 'none' | 'pro';

interface SubscriptionState {
  loading: boolean;
  tier: PlanTier;
}

// Queries the `subscriptions` table joined via `polar_customers` to determine
// whether the authenticated user has an active (or trialing) subscription.
export const useSubscription = (user: User | null): SubscriptionState => {
  const [state, setState] = useState<SubscriptionState>({ loading: true, tier: 'none' });

  useEffect(() => {
    if (!supabase || !user) {
      setState({ loading: false, tier: 'none' });
      return;
    }

    let cancelled = false;

    supabase
      .from('polar_customers')
      .select('subscriptions(status)')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('useSubscription error:', error);
          setState({ loading: false, tier: 'none' });
          return;
        }

        const subs = (data as any)?.subscriptions ?? [];
        const hasActive = subs.some(
          (s: { status: string }) => s.status === 'active' || s.status === 'trialing'
        );

        setState({ loading: false, tier: hasActive ? 'pro' : 'none' });
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return state;
};
