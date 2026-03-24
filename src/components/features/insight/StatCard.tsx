import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: ReactNode;
}

export function StatCard({ label, value, sub, color, icon }: StatCardProps) {
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
