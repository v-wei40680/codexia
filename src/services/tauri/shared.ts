import { buildUrl, isTauri } from '@/hooks/runtime';
import { toast } from '@/components/ui/use-toast';

export type MarketplaceSkillItem = {
  name: string;
  description?: string | null;
  license?: string | null;
  skillMdPath: string;
  sourceDirPath: string;
  installed: boolean;
};

export type InstalledSkillItem = {
  name: string;
  path: string;
  skillMdPath?: string | null;
  description?: string | null;
};

export type SkillScope = 'user' | 'project';
export type SkillAgent = 'codex' | 'cc';
export type UnifiedMcpClientName = 'codex' | 'cc';

export type UnifiedMcpConfig = {
  mcpServers?: Record<string, unknown>;
};

export type TauriFileEntry = {
  name: string;
  path: string;
  is_directory: boolean;
  size: number | null;
  extension: string | null;
};

export type DbNote = {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  tags: string[] | null;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
};

export type GitStatusEntry = {
  path: string;
  index_status: string;
  worktree_status: string;
};

export type GitStatusResponse = {
  repo_root: string;
  entries: GitStatusEntry[];
};

export type GitFileDiffResponse = {
  old_content: string;
  new_content: string;
  has_changes: boolean;
};

export type GitFileDiffMetaResponse = {
  old_bytes: number;
  new_bytes: number;
  total_bytes: number;
};

export type GitDiffStatsCounts = {
  additions: number;
  deletions: number;
};

export type GitDiffStatsResponse = {
  staged: GitDiffStatsCounts;
  unstaged: GitDiffStatsCounts;
};

export type GitPrepareThreadWorktreeResponse = {
  repo_root: string;
  worktree_path: string;
  existed: boolean;
};

export type TerminalStartResponse = {
  session_id: string;
  shell: string;
};

export async function invokeTauri<T>(
  command: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, payload);
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const message = `Request failed: ${response.status}`;
    toast({
      title: 'Request failed',
      description: message,
      variant: 'destructive',
    });
    return Promise.reject(new Error(message));
  }

  return (await response.json()) as T;
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = `Request failed: ${response.status}`;
    toast({
      title: 'Request failed',
      description: message,
      variant: 'destructive',
    });
    return Promise.reject(new Error(message));
  }

  return (await response.json()) as T;
}

export async function postNoContent(path: string, body?: unknown): Promise<void> {
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = `Request failed: ${response.status}`;
    toast({
      title: 'Request failed',
      description: message,
      variant: 'destructive',
    });
    return Promise.reject(new Error(message));
  }
}

export { isTauri, toast };
