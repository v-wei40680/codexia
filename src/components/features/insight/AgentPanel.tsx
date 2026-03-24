import { Activity, Zap, DollarSign } from 'lucide-react';
import { type Range, type AgentKey, AGENT_CONFIG, RANGES, type ModelPricing } from './constants';
import { fmtTokens, fmtCost, estimateCost } from './utils';
import { StatCard } from './StatCard';
import { ModelBadges } from './ModelBadges';
import { ContributionHeatmap } from './ContributionHeatmap';
import { ToolList } from './ToolList';
import type { HeatmapData } from '@/services/tauri/insights';

interface AgentPanelProps {
  agentKey: AgentKey;
  data: HeatmapData;
  range: Range;
  pricing: Record<string, ModelPricing>;
}

export function AgentPanel({ agentKey, data, range, pricing }: AgentPanelProps) {
  const { color } = AGENT_CONFIG[agentKey];
  const sessions = data.total_files;
  const actDays = data.data.filter(d => d.count > 0).length;
  const cost = estimateCost(data.token_stats, data.models, agentKey, pricing);
  const rangeLabel = range === 'all' ? 'All time' : `Last ${RANGES.find(r => r.value === range)?.label}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Sessions"
          value={sessions.toLocaleString()}
          sub={rangeLabel}
          color={color}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Tokens"
          value={fmtTokens(data.token_stats.total_tokens)}
          sub={rangeLabel}
          color={color}
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          label="Est. Cost"
          value={fmtCost(cost)}
          sub={rangeLabel}
          color="#f59e0b"
          icon={<DollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Models used */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3 flex items-center gap-3">
        <span className="shrink-0 text-xs text-slate-500">Models</span>
        <ModelBadges models={data.models} color={color} />
      </div>

      {/* Token detail */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs sm:grid-cols-4">
          {[
            { label: 'Input', val: data.token_stats.input_tokens },
            { label: 'Output', val: data.token_stats.output_tokens },
            { label: 'Cache Read', val: data.token_stats.cache_read_tokens },
            { label: 'Cache Created', val: data.token_stats.cache_creation_tokens },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-slate-500">{label}</p>
              <p className="font-mono font-semibold text-slate-200">{fmtTokens(val)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Activity — {rangeLabel}
          </span>
          <span>{actDays} active day{actDays !== 1 ? 's' : ''}</span>
        </div>
        <ContributionHeatmap data={data} color={color} range={range} />
      </div>

      <ToolList tools={data.tool_calls} color={color} title="Tool Usage" />
    </div>
  );
}
