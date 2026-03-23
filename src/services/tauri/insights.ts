import { invoke } from '@tauri-apps/api/core';

export interface DayActivity {
  date: string;
  count: number;
  size: number;
}

export interface ToolCallStats {
  tool_name: string;
  count: number;
}

export interface TokenStats {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  reasoning_tokens?: number;
  total_tokens: number;
}

export interface HeatmapData {
  agent: string;
  data: DayActivity[];
  max_count: number;
  total_files: number;
  total_size: number;
  tool_calls: ToolCallStats[];
  token_stats: TokenStats;
  /** Unique model names seen, sorted by frequency */
  models: string[];
}

export interface AgentHeatmaps {
  claude: HeatmapData | null;
  codex: HeatmapData | null;
  gemini: HeatmapData | null;
}

export async function getAgentHeatmaps(since?: string): Promise<AgentHeatmaps> {
  return invoke<AgentHeatmaps>('get_agent_heatmaps', { since: since ?? null });
}
