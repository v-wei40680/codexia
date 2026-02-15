import { invokeTauri, isTauri, postJson, postNoContent } from './shared';

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

export async function gitStatus(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<GitStatusResponse>('git_status', { cwd });
  }
  return await postJson<GitStatusResponse>('/api/git/status', { cwd });
}

export async function gitFileDiff(cwd: string, filePath: string, staged: boolean) {
  if (isTauri()) {
    return await invokeTauri<GitFileDiffResponse>('git_file_diff', { cwd, filePath, staged });
  }
  return await postJson<GitFileDiffResponse>('/api/git/file-diff', { cwd, filePath, staged });
}

export async function gitFileDiffMeta(cwd: string, filePath: string, staged: boolean) {
  if (isTauri()) {
    return await invokeTauri<GitFileDiffMetaResponse>('git_file_diff_meta', {
      cwd,
      filePath,
      staged,
    });
  }
  return await postJson<GitFileDiffMetaResponse>('/api/git/file-diff-meta', {
    cwd,
    filePath,
    staged,
  });
}

export async function gitDiffStats(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<GitDiffStatsResponse>('git_diff_stats', { cwd });
  }
  return await postJson<GitDiffStatsResponse>('/api/git/diff-stats', { cwd });
}

export async function gitStageFiles(cwd: string, filePaths: string[]) {
  if (isTauri()) {
    return await invokeTauri<void>('git_stage_files', { cwd, filePaths });
  }
  await postNoContent('/api/git/stage-files', { cwd, filePaths });
}

export async function gitUnstageFiles(cwd: string, filePaths: string[]) {
  if (isTauri()) {
    return await invokeTauri<void>('git_unstage_files', { cwd, filePaths });
  }
  await postNoContent('/api/git/unstage-files', { cwd, filePaths });
}

export async function gitPrepareThreadWorktree(cwd: string, threadKey: string) {
  if (isTauri()) {
    return await invokeTauri<GitPrepareThreadWorktreeResponse>('git_prepare_thread_worktree', {
      cwd,
      threadKey,
    });
  }
  return await postJson<GitPrepareThreadWorktreeResponse>('/api/git/prepare-thread-worktree', {
    cwd,
    threadKey,
  });
}

function resolveCwd(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.slice(0, lastSlash) : '.';
}

export async function getGitFileDiff<T = unknown>(filePath: string) {
  const cwd = resolveCwd(filePath);
  if (isTauri()) {
    const diff = await invokeTauri<GitFileDiffResponse>('git_file_diff', {
      cwd,
      filePath,
      staged: false,
    });
    return {
      original_content: diff.old_content,
      current_content: diff.new_content,
      has_changes: diff.has_changes,
    } as T;
  }
  const diff = await postJson<GitFileDiffResponse>('/api/git/file-diff', {
    cwd,
    filePath,
    staged: false,
  });
  return {
    original_content: diff.old_content,
    current_content: diff.new_content,
    has_changes: diff.has_changes,
  } as T;
}
