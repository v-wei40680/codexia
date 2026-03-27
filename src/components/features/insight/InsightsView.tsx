import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Settings2, ChevronDown, Sparkles } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useProTrial } from '@/hooks/useProTrial';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getAgentHeatmaps,
  getInsightFilterOptions,
  getInsightRankings,
  type AgentHeatmaps,
  type FilterOptions,
  type Rankings,
} from '@/services/tauri/insights';
import { type Range, type AgentKey, AGENT_CONFIG, RANGES, type ModelPricing } from './constants';
import { PRICING_URL } from '@/lib/constants';
import { loadPricing, savePricing } from './utils';
import { LoadingState, ErrorState } from './States';
import { PricingEditor } from './PricingEditor';
import { AgentPanel } from './AgentPanel';
import { OverviewTab } from './OverviewTab';
import { RankingsTab } from './RankingsTab';

export default function InsightsView() {
  const { isPro, trialDaysLeft } = useProTrial();

  const [data, setData] = useState<AgentHeatmaps | null>(null);
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('month');
  const [pricing, setPricing] = useState<Record<string, ModelPricing>>(loadPricing);
  const [showPricing, setShowPricing] = useState(false);

  // filters
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ cwds: [], session_ids: [] });
  const [selectedCwd, setSelectedCwd] = useState<string | null>(null);

  useEffect(() => {
    getInsightFilterOptions().then(setFilterOptions).catch(() => { });
  }, []);

  const load = useCallback(
    async (r: Range, cwd: string | null) => {
      setLoading(true);
      setError(null);
      const filters = {
        range: r === 'all' ? undefined : r,
        cwd: cwd ?? undefined,
      };
      try {
        const [heatmaps, ranks] = await Promise.all([
          getAgentHeatmaps(filters),
          getInsightRankings(filters),
        ]);
        setData(heatmaps);
        setRankings(ranks);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(range, selectedCwd);
  }, [range, selectedCwd, load]);

  function handleSavePricing(p: Record<string, ModelPricing>) {
    savePricing(p);
    setPricing(p);
  }

  const agentTabs = data
    ? (Object.keys(AGENT_CONFIG) as AgentKey[]).filter(k => !!data[k])
    : [];

  const hasFilters = !!selectedCwd;

  return (
    <div className="h-full overflow-auto bg-slate-950 p-5">

      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4 flex flex-wrap items-center justify-between gap-3"
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
                onClick={() => setRange(r.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${range === r.value
                  ? 'bg-slate-700 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            onClick={() => setShowPricing(true)}
            title="Edit model pricing"
          >
            <Settings2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            onClick={() => load(range, selectedCwd)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      {/* ── pro trial banner ── */}
      {!isPro && !import.meta.env.DEV && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3.5 py-2.5"
        >
          <div className="flex items-center gap-2 text-sm text-violet-300">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>
              This is a <span className="font-semibold text-violet-200">Pro</span> feature.
              {trialDaysLeft !== null && trialDaysLeft > 0
                ? <> Trial ends in <span className="font-semibold text-violet-200">{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}</span>.</>
                : trialDaysLeft === 0
                  ? <> Your trial has ended.</>
                  : null}
            </span>
          </div>
          <button
            onClick={() => void openUrl(PRICING_URL)}
            className="shrink-0 rounded-md bg-violet-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-400 transition-colors"
          >
            Upgrade
          </button>
        </motion.div>
      )}

      {/* ── filter bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="mb-4 flex flex-wrap items-center gap-2"
      >

        {/* cwd filter */}
        {filterOptions.cwds.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${selectedCwd
                  ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <span className="max-w-[160px] truncate">
                  {selectedCwd ? selectedCwd.split('/').slice(-2).join('/') : 'CWD'}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-60 overflow-auto bg-slate-900 border-slate-800 text-xs"
            >
              <DropdownMenuItem
                className="text-slate-400 focus:text-slate-100"
                onSelect={() => setSelectedCwd(null)}
              >
                All directories
              </DropdownMenuItem>
              {filterOptions.cwds.map(c => (
                <DropdownMenuItem
                  key={c}
                  className={`font-mono focus:text-slate-100 ${selectedCwd === c ? 'text-violet-300' : 'text-slate-300'
                    }`}
                  onSelect={() => setSelectedCwd(selectedCwd === c ? null : c)}
                >
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {hasFilters && (
          <button
            onClick={() => {
              setSelectedCwd(null);
            }}
            className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </motion.div>

      {/* ── content ── */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => load(range, selectedCwd)} />
      ) : data ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${range}-${selectedCwd}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-slate-900/60 border border-slate-800">
                <TabsTrigger value="overview" className="text-xs text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100">
                  Overview
                </TabsTrigger>
                {agentTabs.map(k => (
                  <TabsTrigger
                    key={k}
                    value={k}
                    className="text-xs capitalize text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
                  >
                    {AGENT_CONFIG[k].icon}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="rankings" className="text-xs text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100">
                  Top Usage
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                <OverviewTab heatmaps={data} range={range} pricing={pricing} />
              </TabsContent>

              {agentTabs.map(k => (
                <TabsContent key={k} value={k} className="mt-0 focus-visible:outline-none">
                  <AgentPanel agentKey={k} data={data[k]!} range={range} pricing={pricing} />
                </TabsContent>
              ))}

              <TabsContent value="rankings" className="mt-0 focus-visible:outline-none">
                {rankings
                  ? <RankingsTab rankings={rankings} />
                  : <LoadingState />
                }
              </TabsContent>
            </Tabs>
          </motion.div>
        </AnimatePresence>
      ) : null}

      <AnimatePresence>
        {showPricing && (
          <PricingEditor
            pricing={pricing}
            onSave={handleSavePricing}
            onClose={() => setShowPricing(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
