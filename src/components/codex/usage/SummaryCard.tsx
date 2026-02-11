import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SummaryCardProps {
  title: string;
  value: string;
  description: string;
  accent?: string;
}

export function SummaryCard({
  title,
  value,
  description,
  accent = 'text-slate-400',
}: SummaryCardProps) {
  return (
    <Card className="bg-slate-950/50 border-slate-800/50 hover:border-slate-700/50 transition-colors gap-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent}`}>{value}</div>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
