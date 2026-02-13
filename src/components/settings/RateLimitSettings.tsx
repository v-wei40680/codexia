import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { invoke } from '@tauri-apps/api/core';
import type { GetAccountRateLimitsResponse } from '@/bindings/v2/GetAccountRateLimitsResponse';
import type { RateLimitWindow } from '@/bindings/v2/RateLimitWindow';
import { cn } from '@/lib/utils';
import { Cell, Pie, PieChart } from 'recharts';

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
      remainingFill: '#ef4444',
      usedFill: '#fecaca',
    };
  }

  if (usedPercent >= 70) {
    return {
      border: 'border-amber-300/80',
      bg: 'bg-amber-50/70 dark:bg-amber-950/25',
      label: 'text-amber-700 dark:text-amber-300',
      value: 'text-amber-700 dark:text-amber-300',
      remainingFill: '#f59e0b',
      usedFill: '#fde68a',
    };
  }

  return {
    border: 'border-emerald-300/80',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    label: 'text-emerald-700 dark:text-emerald-300',
    value: 'text-emerald-700 dark:text-emerald-300',
    remainingFill: '#10b981',
    usedFill: '#a7f3d0',
  };
}

type RateLimitSettingsProps = {
  className?: string;
};

type RateLimitFanProps = {
  label: string;
  remainingPercent: number;
};

function RateLimitFan({ label, remainingPercent }: RateLimitFanProps) {
  const tone = getTone(remainingPercent);
  const usedPercent = Math.max(0, 100 - remainingPercent);
  const chartData = [
    { name: 'remaining', value: remainingPercent, fill: tone.remainingFill },
    { name: 'used', value: usedPercent, fill: tone.usedFill },
  ];

  return (
    <div className="flex aspect-square flex-col items-center justify-center text-center">
      <div className="relative h-20 w-20">
        <PieChart width={80} height={80}>
          <Pie
            data={chartData}
            dataKey="value"
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={38}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {chartData.map((item) => (
              <Cell key={item.name} fill={item.fill} />
            ))}
          </Pie>
        </PieChart>

        <span className="absolute inset-0 flex items-center justify-center leading-tight">
          <span className={cn('block text-sm font-semibold', tone.value)}>{remainingPercent}%</span>
        </span>
      </div>
      <span className={cn('mt-1 text-[11px] leading-none', tone.label)}>{label} left</span>
    </div>
  );
}

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

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="grid grid-cols-2 gap-2">
        <RateLimitFan label="5h" remainingPercent={primaryRemaining} />
        <RateLimitFan label="Week" remainingPercent={secondaryRemaining} />
      </CardContent>
    </Card>
  );
}
