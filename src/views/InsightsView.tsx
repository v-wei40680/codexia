import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, Zap, Activity, Brain, Code2, Gem, TrendingUp, DollarSign, Search, Settings2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { getAgentHeatmaps, type HeatmapData, type AgentHeatmaps, type TokenStats } from '@/services/tauri/insights';
import { subDays, subMonths, format } from 'date-fns';

// ─── types & constants ──────────────────────────────────────────────────────

type Range = '1d' | '7d' | '1m' | '3m' | 'all';
type AgentKey = 'claude' | 'codex' | 'gemini';

const RANGES: { label: string; value: Range }[] = [
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: 'All', value: 'all' },
];

const AGENT_CONFIG: Record<AgentKey, { label: string; color: string; icon: React.ReactNode }> = {
  claude: { label: 'Claude', color: '#a78bfa', icon: <Brain className="h-4 w-4" /> },
  codex:  { label: 'Codex',  color: '#34d399', icon: <Code2 className="h-4 w-4" /> },
  gemini: { label: 'Gemini', color: '#60a5fa', icon: <Gem  className="h-4 w-4" /> },
};

/** Convert a Range to an ISO date string for the backend `since` param, or undefined for "all". */
function rangeToSince(range: Range): string | undefined {
  const now = new Date();
  if (range === '1d')  return format(subDays(now, 1),    'yyyy-MM-dd');
  if (range === '7d')  return format(subDays(now, 7),    'yyyy-MM-dd');
  if (range === '1m')  return format(subMonths(now, 1),  'yyyy-MM-dd');
  if (range === '3m')  return format(subMonths(now, 3),  'yyyy-MM-dd');
  return undefined;
}

// ─── model pricing ──────────────────────────────────────────────────────────

export interface ModelPricing {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
}

/** Default pricing per 1M tokens (USD).
 *  Keys are lowercase substrings matched against model names (most specific first). */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  // ── Claude ────────────────────────────────────────────────────────────────
  'claude-opus-4':           { input: 15.0,  output: 75.0,  cache_read: 1.50,    cache_creation: 18.75 },
  'claude-sonnet-4':         { input: 3.0,   output: 15.0,  cache_read: 0.30,    cache_creation: 3.75  },
  'claude-haiku-4':          { input: 0.80,  output: 4.0,   cache_read: 0.08,    cache_creation: 1.00  },
  // ── GPT-5 Codex variants (most specific first) ────────────────────────────
  'gpt-5.1-codex-max':       { input: 6.00,  output: 24.0,  cache_read: 1.50,    cache_creation: 0 },
  'gpt-5.3-codex':           { input: 5.00,  output: 20.0,  cache_read: 1.25,    cache_creation: 0 },
  'gpt-5.2-codex':           { input: 4.00,  output: 16.0,  cache_read: 1.00,    cache_creation: 0 },
  'gpt-5.1-codex-mini':      { input: 1.10,  output: 4.40,  cache_read: 0.275,   cache_creation: 0 },
  'gpt-5-codex-mini':        { input: 1.10,  output: 4.40,  cache_read: 0.275,   cache_creation: 0 },
  'gpt-5-codex':             { input: 3.00,  output: 12.0,  cache_read: 0.75,    cache_creation: 0 },
  'gpt-5.1-codex':           { input: 3.50,  output: 14.0,  cache_read: 0.875,   cache_creation: 0 },
  // ── GPT-5 base variants ───────────────────────────────────────────────────
  'gpt-5.4':                 { input: 5.00,  output: 20.0,  cache_read: 1.25,    cache_creation: 0 },
  'gpt-5.2':                 { input: 3.50,  output: 14.0,  cache_read: 0.875,   cache_creation: 0 },
  'gpt-5.1':                 { input: 3.00,  output: 12.0,  cache_read: 0.75,    cache_creation: 0 },
  'gpt-5':                   { input: 2.50,  output: 10.0,  cache_read: 0.625,   cache_creation: 0 },
  // ── fallback per-agent defaults (used when model is unknown) ──────────────
  '_claude_fallback':        { input: 3.0,   output: 15.0,  cache_read: 0.30,    cache_creation: 3.75  },
  '_codex_fallback':         { input: 2.5,   output: 10.0,  cache_read: 0.625,   cache_creation: 0     },
  '_gemini_fallback':        { input: 0.075, output: 0.30,  cache_read: 0.01875, cache_creation: 0.1875 },
};

const PRICING_LS_KEY = 'insights_model_pricing';

function loadPricing(): Record<string, ModelPricing> {
  try {
    const s = localStorage.getItem(PRICING_LS_KEY);
    if (s) return { ...DEFAULT_MODEL_PRICING, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_MODEL_PRICING };
}

function savePricing(p: Record<string, ModelPricing>) {
  const overrides: Record<string, ModelPricing> = {};
  for (const [k, v] of Object.entries(p)) {
    const def = DEFAULT_MODEL_PRICING[k];
    if (!def || JSON.stringify(def) !== JSON.stringify(v)) overrides[k] = v;
  }
  localStorage.setItem(PRICING_LS_KEY, JSON.stringify(overrides));
}

function pricingForModel(model: string | undefined, agent: AgentKey, pricing: Record<string, ModelPricing>): ModelPricing {
  if (model) {
    const lower = model.toLowerCase();
    for (const key of Object.keys(pricing)) {
      if (!key.startsWith('_') && lower.includes(key)) return pricing[key];
    }
  }
  return pricing[`_${agent}_fallback`] ?? { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
}

function estimateCost(stats: TokenStats, models: string[], agent: AgentKey, pricing: Record<string, ModelPricing>): number {
  const p = pricingForModel(models[0], agent, pricing);
  return (
    (stats.input_tokens          / 1_000_000) * p.input +
    (stats.output_tokens         / 1_000_000) * p.output +
    (stats.cache_read_tokens     / 1_000_000) * p.cache_read +
    (stats.cache_creation_tokens / 1_000_000) * p.cache_creation
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return '< $0.01';
  return `~$${usd.toFixed(2)}`;
}

function weeksForRange(range: Range): number {
  if (range === '1d') return 2;
  if (range === '7d') return 3;
  if (range === '1m') return 6;
  if (range === '3m') return 14;
  return 26;
}

// ─── contribution heatmap ──────────────────────────────────────────────────

const CELL = 10;
const GAP  = 2;

import { eachDayOfInterval, subDays as _subDays } from 'date-fns';

interface HeatmapProps {
  data: HeatmapData;
  color: string;
  range: Range;
}

function ContributionHeatmap({ data, color, range }: HeatmapProps) {
  const weeks = weeksForRange(range);
  const today = new Date();
  const startDate = _subDays(today, weeks * 7 - 1);

  const activityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of data.data) m.set(d.date, d.count);
    return m;
  }, [data.data]);

  const days = eachDayOfInterval({ start: startDate, end: today });
  const paddedDays: (Date | null)[] = [];
  const offset = (startDate.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) paddedDays.push(null);
  paddedDays.push(...days);

  const grid: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) grid.push(paddedDays.slice(i, i + 7));

  const maxCount = Math.max(1, ...data.data.map(d => d.count));

  function opacity(count: number): number {
    if (!count) return 0;
    const r = count / maxCount;
    if (r < 0.25) return 0.25;
    if (r < 0.5)  return 0.45;
    if (r < 0.75) return 0.65;
    return 0.9;
  }

  const [tip, setTip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  return (
    <div className="overflow-x-auto">
      <svg
        width={grid.length * (CELL + GAP)}
        height={7 * (CELL + GAP)}
        className="overflow-visible"
        onMouseLeave={() => setTip(null)}
      >
        {grid.map((week, wi) =>
          week.map((day, di) => {
            if (!day) return null;
            const ds = format(day, 'yyyy-MM-dd');
            const cnt = activityMap.get(ds) ?? 0;
            const x = wi * (CELL + GAP);
            const y = di * (CELL + GAP);
            return (
              <rect
                key={ds}
                x={x} y={y}
                width={CELL} height={CELL} rx={2}
                fill={cnt ? color : 'rgb(30,32,40)'}
                fillOpacity={opacity(cnt)}
                className="cursor-pointer"
                onMouseEnter={() => setTip({ date: format(day, 'MMM d, yyyy'), count: cnt, x: x + CELL / 2, y: y - 4 })}
              />
            );
          })
        )}
        {tip && (
          <g>
            <rect x={tip.x - 54} y={tip.y - 30} width={108} height={26} rx={4} fill="rgb(15,17,23)" stroke="rgb(51,65,85)" strokeWidth={1} />
            <text x={tip.x} y={tip.y - 20} textAnchor="middle" fill="rgb(226,232,240)" fontSize={9}>{tip.date}</text>
            <text x={tip.x} y={tip.y - 9}  textAnchor="middle" fill={color} fontSize={9} fontWeight="bold">
              {tip.count} session{tip.count !== 1 ? 's' : ''}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── stat card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, sub, color, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-100 tracking-tight truncate">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500 truncate">{sub}</p>}
        </div>
        <div className="ml-2 shrink-0 rounded-lg p-2" style={{ backgroundColor: `${color}18`, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── model badges ──────────────────────────────────────────────────────────

function ModelBadges({ models, color }: { models: string[]; color: string }) {
  if (!models.length) return <span className="text-xs text-slate-600 italic">unknown</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {models.map(m => (
        <span
          key={m}
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

// ─── pricing editor ─────────────────────────────────────────────────────────

interface PricingEditorProps {
  pricing: Record<string, ModelPricing>;
  onSave: (p: Record<string, ModelPricing>) => void;
  onClose: () => void;
}

function PricingEditor({ pricing, onSave, onClose }: PricingEditorProps) {
  const [local, setLocal] = useState<Record<string, ModelPricing>>(() =>
    Object.fromEntries(Object.entries(pricing).filter(([k]) => !k.startsWith('_')))
  );
  const [newKey, setNewKey] = useState('');

  function setField(key: string, field: keyof ModelPricing, raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    setLocal(p => ({ ...p, [key]: { ...p[key], [field]: val } }));
  }

  function addModel() {
    const k = newKey.trim().toLowerCase();
    if (!k || local[k]) return;
    setLocal(p => ({ ...p, [k]: { input: 0, output: 0, cache_read: 0, cache_creation: 0 } }));
    setNewKey('');
  }

  function removeModel(key: string) {
    setLocal(p => { const n = { ...p }; delete n[key]; return n; });
  }

  function handleSave() {
    const merged: Record<string, ModelPricing> = {};
    for (const [k, v] of Object.entries(pricing)) {
      if (k.startsWith('_')) merged[k] = v;
    }
    Object.assign(merged, local);
    onSave(merged);
    onClose();
  }

  function handleReset() {
    setLocal(Object.fromEntries(Object.entries(DEFAULT_MODEL_PRICING).filter(([k]) => !k.startsWith('_'))));
  }

  const cols: (keyof ModelPricing)[] = ['input', 'output', 'cache_read', 'cache_creation'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-200">Model Pricing</h2>
            <span className="text-xs text-slate-500">per 1M tokens (USD)</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-auto max-h-[60vh] px-5 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2 pr-3 font-medium">Model key</th>
                {cols.map(c => (
                  <th key={c} className="pb-2 pr-2 font-medium capitalize w-24">{c.replace('_', ' ')}</th>
                ))}
                <th className="pb-2 w-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {Object.entries(local).map(([key, p]) => (
                <tr key={key} className="group">
                  <td className="py-1.5 pr-3 font-mono text-slate-300 align-middle">{key}</td>
                  {cols.map(c => (
                    <td key={c} className="py-1.5 pr-2 align-middle">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={p[c]}
                        onBlur={e => setField(key, c, e.target.value)}
                        className="w-full rounded-md bg-slate-800 px-2 py-1 font-mono text-xs text-slate-200 border border-slate-700 focus:outline-none focus:border-slate-500"
                      />
                    </td>
                  ))}
                  <td className="py-1.5 align-middle">
                    <button
                      onClick={() => removeModel(key)}
                      className="invisible group-hover:visible text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-800 px-5 py-3 flex items-center gap-2">
          <input
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addModel()}
            placeholder="Add model key (e.g. gpt-5)"
            className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 border border-slate-700 focus:outline-none focus:border-slate-500 placeholder:text-slate-600"
          />
          <Button size="sm" variant="secondary" onClick={addModel} className="h-7 text-xs">Add</Button>
        </div>

        <div className="border-t border-slate-800 px-5 py-3 flex items-center justify-between">
          <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Reset to defaults
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose} className="h-7 text-xs text-slate-400">Cancel</Button>
            <Button size="sm" onClick={handleSave} className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1">
              <Check className="h-3 w-3" /> Save
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── tool list ─────────────────────────────────────────────────────────────

interface ToolListProps {
  tools: { tool_name: string; count: number }[];
  color: string;
  title?: string;
}

function ToolList({ tools, color, title = 'Tool Usage' }: ToolListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? tools.filter(t => t.tool_name.toLowerCase().includes(q)) : tools;
    return list.slice().sort((a, b) => b.count - a.count);
  }, [tools, search]);

  const maxCount = tools[0]?.count ?? 1;

  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
        <p className="text-xs text-slate-500 text-center py-2">No tool data</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400">{tools.length}</span>
        </div>
        <div className="relative w-40">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-7 pl-6 text-xs bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {filtered.length === 0 && (
          <p className="py-3 text-center text-xs text-slate-500">No match</p>
        )}
        {filtered.map(({ tool_name, count }) => (
          <div key={tool_name} className="flex items-center gap-2">
            <span className="w-36 shrink-0 truncate font-mono text-xs text-slate-300">{tool_name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(count / maxCount) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-xs text-slate-400">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── token breakdown chart ──────────────────────────────────────────────────

function TokenBreakdownChart({ heatmaps, range }: { heatmaps: AgentHeatmaps; range: Range }) {
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
          <Bar dataKey="input"  stackId="a" radius={[0, 0, 0, 0]}>{data.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.9} />)}</Bar>
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

// ─── per-agent detail panel ─────────────────────────────────────────────────

interface AgentPanelProps {
  agentKey: AgentKey;
  data: HeatmapData;
  range: Range;
  pricing: Record<string, ModelPricing>;
}

function AgentPanel({ agentKey, data, range, pricing }: AgentPanelProps) {
  const { color } = AGENT_CONFIG[agentKey];
  const sessions = data.total_files;
  const actDays  = data.data.filter(d => d.count > 0).length;
  const cost     = estimateCost(data.token_stats, data.models, agentKey, pricing);
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
            { label: 'Input',         val: data.token_stats.input_tokens },
            { label: 'Output',        val: data.token_stats.output_tokens },
            { label: 'Cache Read',    val: data.token_stats.cache_read_tokens },
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

// ─── overview tab ──────────────────────────────────────────────────────────

interface OverviewProps {
  heatmaps: AgentHeatmaps;
  range: Range;
  pricing: Record<string, ModelPricing>;
}

function OverviewTab({ heatmaps, range, pricing }: OverviewProps) {
  const keys = Object.keys(AGENT_CONFIG) as AgentKey[];
  const rangeLabel = range === 'all' ? 'All time' : `Last ${RANGES.find(r => r.value === range)?.label}`;

  const totalSessions = keys.reduce((s, k) => s + (heatmaps[k]?.total_files ?? 0), 0);
  const totalTokens   = keys.reduce((s, k) => s + (heatmaps[k]?.token_stats.total_tokens ?? 0), 0);
  const totalCost     = keys.reduce((s, k) => {
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
        <StatCard label="Sessions"    value={totalSessions.toLocaleString()} sub={rangeLabel} color="#a78bfa" icon={<Activity className="h-4 w-4" />} />
        <StatCard label="Tokens"      value={fmtTokens(totalTokens)}         sub={rangeLabel} color="#34d399" icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Est. Cost"   value={fmtCost(totalCost)}             sub={rangeLabel} color="#f59e0b" icon={<DollarSign className="h-4 w-4" />} />
        <StatCard label="Active Days" value={String(totalActDays)}           sub={rangeLabel} color="#60a5fa" icon={<TrendingUp className="h-4 w-4" />} />
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

// ─── loading / error ────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-violet-500" />
        <p className="text-sm text-slate-400">Scanning agent sessions…</p>
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <p className="mb-3 text-sm text-red-400">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    </div>
  );
}

// ─── main view ─────────────────────────────────────────────────────────────

export default function InsightsView() {
  const [data, setData]       = useState<AgentHeatmaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [range, setRange]     = useState<Range>('1m');
  const [pricing, setPricing] = useState<Record<string, ModelPricing>>(loadPricing);
  const [showPricing, setShowPricing] = useState(false);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAgentHeatmaps(rangeToSince(r)));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(range); }, [range]);

  function handleRangeChange(r: Range) {
    setRange(r);
  }

  function handleSavePricing(p: Record<string, ModelPricing>) {
    savePricing(p);
    setPricing(p);
  }

  const agentTabs = data
    ? (Object.keys(AGENT_CONFIG) as AgentKey[]).filter(k => !!data[k])
    : [];

  return (
    <div className="h-full overflow-auto bg-slate-950 p-5">

      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Agent Insights
          </h1>
          <p className="mt-0.5 text-sm text-slate-400">Usage across Claude · Codex · Gemini</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/60 p-0.5">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r.value
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200" onClick={() => setShowPricing(true)} title="Edit model pricing">
            <Settings2 className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-200" onClick={() => load(range)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      {/* ── content ── */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load(range)} />
      ) : data ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={range}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Tabs defaultValue="overview">
              <TabsList className="mb-4 bg-slate-900/60 border border-slate-800/60">
                <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
                  Overview
                </TabsTrigger>
                {agentTabs.map(k => (
                  <TabsTrigger key={k} value={k} className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {AGENT_CONFIG[k].icon}
                      {AGENT_CONFIG[k].label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview">
                <OverviewTab heatmaps={data} range={range} pricing={pricing} />
              </TabsContent>

              {agentTabs.map(k => (
                <TabsContent key={k} value={k}>
                  <AgentPanel agentKey={k} data={data[k]!} range={range} pricing={pricing} />
                </TabsContent>
              ))}
            </Tabs>
          </motion.div>
        </AnimatePresence>
      ) : null}

      <p className="mt-4 text-center text-xs text-slate-600">
        Cost estimates based on detected model names and configurable pricing.
        <button onClick={() => setShowPricing(true)} className="ml-1 underline hover:text-slate-400 transition-colors">
          Edit pricing
        </button>
      </p>

      <AnimatePresence>
        {showPricing && (
          <PricingEditor pricing={pricing} onSave={handleSavePricing} onClose={() => setShowPricing(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
