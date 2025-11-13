import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageSummary, calculateUsageSummary } from "@/utils/usageAnalysis";
import {
  TokenDistributionChart,
  TimelineChart,
  ProjectUsageChart,
  ModelUsageChart,
  TopProjectsCard,
  SummaryCard,
  TokenBreakdownCard,
  MostUsedModelsCard,
} from "@/components/usage";
import { formatCurrency, formatNumber, formatTokens } from "@/utils/formater";
export default function UsagePage() {
  const [usageData, setUsageData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await calculateUsageSummary();
      setUsageData(data);
    } catch (err) {
      console.error("Failed to load usage data:", err);
      setError("Failed to load usage data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsageData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadUsageData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadUsageData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!usageData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No usage data available</p>
          <Button onClick={loadUsageData}>Refresh</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Usage Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Track your Codex usage and costs
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          title="Total Cost"
          value={formatCurrency(usageData.totalCost)}
          description="Estimated spending"
          accent="text-emerald-400"
        />
        <SummaryCard
          title="Total Sessions"
          value={formatNumber(usageData.totalSessions)}
          description="Conversations completed"
          accent="text-cyan-400"
        />
        <SummaryCard
          title="Total Tokens"
          value={formatTokens(usageData.totalTokens)}
          description="Input + Output tokens"
          accent="text-purple-400"
        />
        <SummaryCard
          title="Avg Cost/Session"
          value={formatCurrency(usageData.avgCostPerSession)}
          description="Per conversation"
          accent="text-orange-400"
        />
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-950/50 border-slate-800">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="models"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            By Model
          </TabsTrigger>
          <TabsTrigger
            value="projects"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            By Project
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="tokens"
            className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400"
          >
            Token Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TokenBreakdownCard
              usageData={usageData}
              formatTokens={formatTokens}
            />
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
          <TokenDistributionChart
            usageData={usageData}
            formatTokens={formatTokens}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
