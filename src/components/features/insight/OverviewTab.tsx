import { useMemo } from 'react';
import { Activity, Zap, DollarSign, TrendingUp } from 'lucide-react';
import { type Range, type AgentKey, AGENT_CONFIG, RANGES, type ModelPricing } from './constants';
import { fmtTokens, fmtCost, estimateCost } from './utils';
import { StatCard } from './StatCard';
import { ContributionHeatmap } from './ContributionHeatmap';
import { TokenBreakdownChart } from './TokenBreakdownChart';
import { ToolList } from './ToolList';
import type { AgentHeatmaps } from '@/services/tauri/insights';

interface OverviewProps {
  heatmaps: AgentHeatmaps;
  range: Range;
  pricing: Record<string, ModelPricing>;
}

export function OverviewTab({ heatmaps, range, pricing }: OverviewProps) {
  const keys = Object.keys(AGENT_CONFIG) as AgentKey[];
  const rangeLabel = range === 'all' ? 'All time' : `Last ${RANGES.find(r => r.value === range)?.label}`;

  const totalSessions = keys.reduce((s, k) => s + (heatmaps[k]?.total_files ?? 0), 0);
  const totalTokens = keys.reduce((s, k) => s + (heatmaps[k]?.token_stats.total_tokens ?? 0), 0);
  const totalCost = keys.reduce((s, k) => {
    const h = heatmaps[k];
    return s + (h ? estimateCost(h.token_stats, h.models, k, pricing) : 0);
  }, 0);
  const totalActDays = (() => {
    const dates = new Set<string>();
    for (const k of keys) for (const d of heatmaps[k]?.data ?? []) if (d.count > 0) dates.add(d.date);
    return dates.size;
  })();

  const mergedTools = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of keys) for (const t of heatmaps[k]?.tool_calls ?? []) m.set(t.tool_name, (m.get(t.tool_name) ?? 0) + t.count);
    return [...m.entries()].map(([tool_name, count]) => ({ tool_name, count })).sort((a, b) => b.count - a.count);
  }, [heatmaps]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sessions" value={totalSessions.toLocaleString()} sub={rangeLabel} color="#a78bfa" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Tokens" value={fmtTokens(totalTokens)} sub={rangeLabel} color="#34d399" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Est. Cost" value={fmtCost(totalCost)} sub={rangeLabel} color="#f59e0b" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Active Days" value={String(totalActDays)} sub={rangeLabel} color="#60a5fa" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 space-y-5">
        <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <Activity className="h-3.5 w-3.5" /> Activity by agent
        </p>
        {keys.map(k => {
          const h = heatmaps[k];
          if (!h) return null;
          const { label, color, icon } = AGENT_CONFIG[k];
          return (
            <div key={k} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color }}>
                  {icon}
                  <span className="font-semibold text-slate-200">{label}</span>
                  {h.models[0] && <span className="ml-1 font-mono text-slate-500">{h.models[0]}</span>}
                </span>
                <span className="text-slate-400">{h.total_files} session{h.total_files !== 1 ? 's' : ''} · {fmtTokens(h.token_stats.total_tokens)} tokens</span>
              </div>
              <ContributionHeatmap data={h} color={color} range={range} />
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TokenBreakdownChart heatmaps={heatmaps} range={range} />
        <ToolList tools={mergedTools} color="#a78bfa" title="All Tools (merged)" />
      </div>
    </div>
  );
}
