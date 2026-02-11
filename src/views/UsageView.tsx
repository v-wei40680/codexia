import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsageSummary, calculateUsageSummary } from '@/utils/usageAnalysis';
import {
  TokenDistributionChart,
  TimelineChart,
  ProjectUsageChart,
  ModelUsageChart,
  TopProjectsCard,
  SummaryCard,
  TokenBreakdownCard,
  MostUsedModelsCard,
} from '@/components/codex/usage';
import { LoadingState, ErrorState, EmptyState } from '@/components/codex/usage/common';
import { formatCurrency, formatNumber, formatTokens } from '@/utils/formater';

const TAB_TRIGGER_CLASS =
  'data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400';

const SUMMARY_CARDS = [
  {
    title: 'Total Cost',
    key: 'totalCost',
    format: formatCurrency,
    description: 'Estimated spending',
    accent: 'text-emerald-400',
  },
  {
    title: 'Total Sessions',
    key: 'totalSessions',
    format: formatNumber,
    description: 'Conversations completed',
    accent: 'text-cyan-400',
  },
  {
    title: 'Total Tokens',
    key: 'totalTokens',
    format: formatTokens,
    description: 'Input + Output tokens',
    accent: 'text-purple-400',
  },
  {
    title: 'Avg Cost/Session',
    key: 'avgCostPerSession',
    format: formatCurrency,
    description: 'Per conversation',
    accent: 'text-orange-400',
  },
] as const;

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'models', label: 'By Model' },
  { value: 'projects', label: 'By Project' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'tokens', label: 'Token Breakdown' },
] as const;

export default function UsagePage() {
  const [usageData, setUsageData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await calculateUsageSummary();
      setUsageData(data);
    } catch (err) {
      console.error('Failed to load usage data:', err);
      setError('Failed to load usage data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  useEffect(() => {
    loadUsageData();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadUsageData} />;
  if (!usageData) return <EmptyState onRefresh={loadUsageData} />;

  return (
    <div className="p-6 bg-slate-900 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Usage Dashboard</h1>
          <p className="text-slate-400 mt-1">Track your Codex usage and costs</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            title={card.title}
            value={card.format(usageData[card.key as keyof UsageSummary] as number)}
            description={card.description}
            accent={card.accent}
          />
        ))}
      </div>

      {/* Detailed Views */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-slate-950/50 border-slate-800">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={TAB_TRIGGER_CLASS}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TokenBreakdownCard usageData={usageData} formatTokens={formatTokens} />
            <MostUsedModelsCard
              usageData={usageData}
              formatCurrency={formatCurrency}
              formatTokens={formatTokens}
            />
          </div>
          <TopProjectsCard
            usageData={usageData}
            formatCurrency={formatCurrency}
            formatTokens={formatTokens}
          />
        </TabsContent>

        <TabsContent value="models">
          <ModelUsageChart
            usageData={usageData}
            formatCurrency={formatCurrency}
            formatTokens={formatTokens}
          />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectUsageChart
            usageData={usageData}
            formatCurrency={formatCurrency}
            formatTokens={formatTokens}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineChart
            usageData={usageData}
            formatCurrency={formatCurrency}
            formatTokens={formatTokens}
          />
        </TabsContent>

        <TabsContent value="tokens">
          <TokenDistributionChart usageData={usageData} formatTokens={formatTokens} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
