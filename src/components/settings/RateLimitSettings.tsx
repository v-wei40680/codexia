import { useCallback, useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { invoke } from '@tauri-apps/api/core';
import type { GetAccountRateLimitsResponse } from '@/bindings/v2/GetAccountRateLimitsResponse';
import type { RateLimitWindow } from '@/bindings/v2/RateLimitWindow';
import { cn } from '@/lib/utils';

function getRemainingPercent(window: RateLimitWindow | null) {
  const usedPercent = window ? Number(window.usedPercent ?? 0) : 0;
  return Math.max(0, 100 - usedPercent);
}

function getTone(remainingPercent: number) {
  const usedPercent = 100 - remainingPercent;

  if (usedPercent >= 90) {
    return {
      border: 'border-red-300/80',
      bg: 'bg-red-50/70 dark:bg-red-950/25',
      label: 'text-red-700 dark:text-red-300',
      value: 'text-red-700 dark:text-red-300',
    };
  }

  if (usedPercent >= 70) {
    return {
      border: 'border-amber-300/80',
      bg: 'bg-amber-50/70 dark:bg-amber-950/25',
      label: 'text-amber-700 dark:text-amber-300',
      value: 'text-amber-700 dark:text-amber-300',
    };
  }

  return {
    border: 'border-emerald-300/80',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    label: 'text-emerald-700 dark:text-emerald-300',
    value: 'text-emerald-700 dark:text-emerald-300',
  };
}

type RateLimitSettingsProps = {
  className?: string;
};

export function RateLimitSettings({ className }: RateLimitSettingsProps) {
  const [rateLimits, setRateLimits] = useState<GetAccountRateLimitsResponse | null>(null);

  const fetchRateLimits = useCallback(async () => {
    try {
      const response = await invoke<GetAccountRateLimitsResponse>('account_rate_limits');
      setRateLimits(response);
    } catch {
      // Keep UI minimal: silently ignore fetch errors and keep fallback values.
    }
  }, []);

  useEffect(() => {
    fetchRateLimits();
  }, [fetchRateLimits]);

  const primaryWindow = rateLimits?.rateLimits.primary ?? null;
  const secondaryWindow = rateLimits?.rateLimits.secondary ?? null;
  const primaryRemaining = getRemainingPercent(primaryWindow);
  const secondaryRemaining = getRemainingPercent(secondaryWindow);
  const primaryTone = getTone(primaryRemaining);
  const secondaryTone = getTone(secondaryRemaining);

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="grid grid-cols-2 gap-2 p-2">
        <div
          className={cn(
            'flex aspect-square items-center justify-center rounded-full border text-center',
            primaryTone.border,
            primaryTone.bg
          )}
        >
          <span className="leading-tight">
            <span className={cn('block text-[11px]', primaryTone.label)}>5h</span>
            <span className={cn('block text-sm font-semibold', primaryTone.value)}>
              {primaryRemaining}% left
            </span>
          </span>
        </div>
        <div
          className={cn(
            'flex aspect-square items-center justify-center rounded-full border text-center',
            secondaryTone.border,
            secondaryTone.bg
          )}
        >
          <span className="leading-tight">
            <span className={cn('block text-[11px]', secondaryTone.label)}>Week</span>
            <span className={cn('block text-sm font-semibold', secondaryTone.value)}>
              {secondaryRemaining}% left
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
