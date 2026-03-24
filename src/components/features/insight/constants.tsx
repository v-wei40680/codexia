import { Brain, Code2, Gem } from 'lucide-react';
import type { ReactNode } from 'react';

export type Range = '1d' | '7d' | '1m' | '3m' | 'all';
export type AgentKey = 'claude' | 'codex' | 'gemini';

export const RANGES: { label: string; value: Range }[] = [
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '1M', value: '1m' },
  { label: '3M', value: '3m' },
  { label: 'All', value: 'all' },
];

export const AGENT_CONFIG: Record<AgentKey, { label: string; color: string; icon: ReactNode }> = {
  claude: { label: 'Claude', color: '#a78bfa', icon: <Brain className="h-4 w-4" /> },
  codex: { label: 'Codex', color: '#34d399', icon: <Code2 className="h-4 w-4" /> },
  gemini: { label: 'Gemini', color: '#60a5fa', icon: <Gem className="h-4 w-4" /> },
};

export interface ModelPricing {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
}
