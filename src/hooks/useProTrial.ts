import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

const TRIAL_DAYS = 7;

export function useProTrial() {
  const { user } = useAuth();
  const { tier } = useSubscription(user);
  const isPro = tier === 'pro';

  const trialDaysLeft = useMemo(() => {
    if (!user) return null;
    const key = `pro_trial_start_${user.id}`;
    let start = localStorage.getItem(key);
    if (!start) {
      start = Date.now().toString();
      localStorage.setItem(key, start);
    }
    const elapsed = (Date.now() - Number(start)) / 86_400_000;
    return Math.max(0, TRIAL_DAYS - Math.floor(elapsed));
  }, [user]);

  // True when non-pro user is within the trial window
  const inTrial = !isPro && trialDaysLeft !== null && trialDaysLeft > 0;

  return { isPro, trialDaysLeft, inTrial };
}
