import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { UsageSummary, calculateUsageSummary } from "@/utils/usageAnalysis";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(3)}`;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`;
  } else if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

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

  const modelChartData = Object.entries(usageData.modelBreakdown).map(([model, data]) => ({
    name: model,
    sessions: data.sessions,
    cost: data.cost,
    tokens: data.tokens,
  }));

  const projectChartData = Object.entries(usageData.projectBreakdown)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 10) // Top 10 projects
    .map(([project, data]) => ({
      name: project.length > 20 ? project.substring(0, 20) + '...' : project,
      sessions: data.sessions,
      cost: data.cost,
      tokens: data.tokens,
    }));

  const timelineChartData = usageData.timelineData.slice(-30); // Last 30 days

  const tokenBreakdownData = [
    { name: 'Input', value: usageData.inputTokens, color: '#0088FE' },
    { name: 'Output', value: usageData.outputTokens, color: '#00C49F' },
    { name: 'Cache Write', value: usageData.cacheWriteTokens, color: '#FFBB28' },
    { name: 'Cache Read', value: usageData.cacheReadTokens, color: '#FF8042' },
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usage Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your Codex usage and costs</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(usageData.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Estimated spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(usageData.totalSessions)}</div>
            <p className="text-xs text-muted-foreground">
              Conversations completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(usageData.totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              Input + Output tokens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(usageData.avgCostPerSession)}</div>
            <p className="text-xs text-muted-foreground">
              Per conversation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">By Model</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="tokens">Token Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Token Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Token Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Input Tokens</span>
                    <Badge variant="outline">{formatTokens(usageData.inputTokens)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Output Tokens</span>
                    <Badge variant="outline">{formatTokens(usageData.outputTokens)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Write</span>
                    <Badge variant="outline">{formatTokens(usageData.cacheWriteTokens)}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Read</span>
                    <Badge variant="outline">{formatTokens(usageData.cacheReadTokens)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Most Used Models */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Models</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(usageData.modelBreakdown)
                    .sort((a, b) => b[1].sessions - a[1].sessions)
                    .slice(0, 5)
                    .map(([model, data]) => (
                      <div key={model} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{model}</span>
                          <span className="text-sm text-muted-foreground">
                            {data.sessions} sessions
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                          <span>{formatCurrency(data.cost)}</span>
                          <span>{formatTokens(data.tokens)} tokens</span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Top Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(usageData.projectBreakdown)
                  .sort((a, b) => b[1].cost - a[1].cost)
                  .slice(0, 5)
                  .map(([project, data]) => (
                    <div key={project} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{project}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.sessions} sessions • {formatTokens(data.tokens)} tokens
                        </p>
                      </div>
                      <Badge variant="secondary">{formatCurrency(data.cost)}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={modelChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'cost' ? formatCurrency(value as number) : 
                      name === 'tokens' ? formatTokens(value as number) : value,
                      name
                    ]}
                  />
                  <Bar dataKey="sessions" fill="#8884d8" name="Sessions" />
                  <Bar dataKey="cost" fill="#82ca9d" name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Usage by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={projectChartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'cost' ? formatCurrency(value as number) : 
                      name === 'tokens' ? formatTokens(value as number) : value,
                      name
                    ]}
                  />
                  <Bar dataKey="cost" fill="#8884d8" name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Usage Timeline (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'cost' ? formatCurrency(value as number) : 
                      name === 'tokens' ? formatTokens(value as number) : value,
                      name
                    ]}
                  />
                  <Line type="monotone" dataKey="cost" stroke="#8884d8" name="Cost" />
                  <Line type="monotone" dataKey="sessions" stroke="#82ca9d" name="Sessions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Token Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tokenBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent ? percent * 100 : 0).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tokenBreakdownData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatTokens(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  {tokenBreakdownData.map((item, index) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {formatTokens(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}