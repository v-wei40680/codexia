import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { type Range, type AgentKey, AGENT_CONFIG, RANGES } from './constants';
import { fmtTokens } from './utils';
import type { AgentHeatmaps } from '@/services/tauri/insights';

export function TokenBreakdownChart({ heatmaps, range }: { heatmaps: AgentHeatmaps; range: Range }) {
  const data = (Object.keys(AGENT_CONFIG) as AgentKey[]).flatMap(key => {
    const h = heatmaps[key];
    if (!h) return [];
    const { label, color } = AGENT_CONFIG[key];
    const ts = h.token_stats;
    return [{ name: label, input: ts.input_tokens, output: ts.output_tokens, cached: ts.cache_read_tokens, color }];
  });

  if (!data.length) return null;

  const rangeLabel = range === 'all' ? 'All time' : `Last ${RANGES.find(r => r.value === range)?.label}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-xl">
        <p className="mb-1 font-semibold text-slate-200">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
            <span className="capitalize text-slate-400">{p.dataKey}:</span>
            <span className="font-mono text-slate-200">{fmtTokens(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200">Token Breakdown</h3>
        <span className="text-xs text-slate-500">({rangeLabel})</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} barSize={28}>
          <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtTokens} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="input" stackId="a" radius={[0, 0, 0, 0]}>{data.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.9} />)}</Bar>
          <Bar dataKey="output" stackId="a" radius={[0, 0, 0, 0]}>{data.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.5} />)}</Bar>
          <Bar dataKey="cached" stackId="a" radius={[4, 4, 0, 0]}>{data.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.25} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400/90" /> Input</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400/50" /> Output</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400/25" /> Cached</span>
      </div>
    </div>
  );
}
