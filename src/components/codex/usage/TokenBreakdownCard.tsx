import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UsageSummary } from '@/utils/usageAnalysis';

interface TokenBreakdownCardProps {
  usageData: UsageSummary;
  formatTokens: (tokens: number) => string;
}

export function TokenBreakdownCard({ usageData, formatTokens }: TokenBreakdownCardProps) {
  return (
    <Card className="bg-slate-950/50 border-slate-800/50">
      <CardHeader>
        <CardTitle className="text-slate-100">Token Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Input Tokens</span>
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
              {formatTokens(usageData.input_tokens)}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Output Tokens</span>
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
              {formatTokens(usageData.output_tokens)}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Cache Write (Reasoning output tokens)</span>
            <Badge variant="outline" className="border-purple-500/50 text-purple-400">
              {formatTokens(usageData.reasoning_output_tokens)}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">Cache Read</span>
            <Badge variant="outline" className="border-orange-500/50 text-orange-400">
              {formatTokens(usageData.cached_input_tokens)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
