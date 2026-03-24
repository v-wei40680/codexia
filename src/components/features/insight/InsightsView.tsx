import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getAgentHeatmaps, type AgentHeatmaps } from '@/services/tauri/insights';
import { type Range, type AgentKey, AGENT_CONFIG, RANGES, type ModelPricing } from './constants';
import { rangeToSince, loadPricing, savePricing } from './utils';
import { LoadingState, ErrorState } from './States';
import { PricingEditor } from './PricingEditor';
import { AgentPanel } from './AgentPanel';
import { OverviewTab } from './OverviewTab';

export default function InsightsView() {
  const [data, setData] = useState<AgentHeatmaps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>('1m');
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

  useEffect(() => { void load(range); }, [range, load]);

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
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${range === r.value
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
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="bg-slate-900/60 border border-slate-800">
                <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-slate-800">Overview</TabsTrigger>
                {agentTabs.map(k => (
                  <TabsTrigger key={k} value={k} className="text-xs capitalize data-[state=active]:bg-slate-800">
                    {AGENT_CONFIG[k].label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
                <OverviewTab heatmaps={data} range={range} pricing={pricing} />
              </TabsContent>

              {agentTabs.map(k => (
                <TabsContent key={k} value={k} className="mt-0 focus-visible:outline-none">
                  <AgentPanel agentKey={k} data={data[k]!} range={range} pricing={pricing} />
                </TabsContent>
              ))}
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
