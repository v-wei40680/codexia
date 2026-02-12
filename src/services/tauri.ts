import type {
  ModelListParams,
  ModelListResponse,
  ThreadStartParams,
  ThreadStartResponse,
  ThreadResumeParams,
  ThreadResumeResponse,
  TurnStartParams,
  TurnStartResponse,
  TurnInterruptParams,
  ThreadListParams,
  ThreadListResponse,
  SkillsListResponse,
  LoginAccountParams,
  CancelLoginAccountParams,
  GetAccountParams,
  LoginAccountResponse,
  CancelLoginAccountResponse,
  LogoutAccountResponse,
  GetAccountResponse,
  ReviewStartParams,
  ReviewStartResponse,
  GetAccountRateLimitsResponse,
  ToolRequestUserInputResponse,
} from '@/bindings/v2';
import type {
  FuzzyFileSearchParams,
  FuzzyFileSearchResponse,
  LoginChatGptResponse,
  ThreadId,
  RequestId,
} from '@/bindings';
import type { CommandExecutionApprovalDecision, FileChangeApprovalDecision } from '@/bindings/v2';
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

async function invokeTauri<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, payload);
}

async function getJson<T>(path: string): Promise<T> {
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

async function postJson<T>(path: string, body?: unknown): Promise<T> {
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

async function postNoContent(path: string, body?: unknown): Promise<void> {
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

export async function listModels() {
  const params: ModelListParams = {
    cursor: null,
    limit: 100,
  };
  if (isTauri()) {
    return await invokeTauri<ModelListResponse>('model_list', { params });
  }
  return await postJson<ModelListResponse>('/api/codex/model/list', params);
}

export async function threadStart(params: ThreadStartParams) {
  if (isTauri()) {
    return await invokeTauri<ThreadStartResponse>('start_thread', { params });
  }
  return await postJson<ThreadStartResponse>('/api/codex/thread/start', params);
}

export async function threadResume(params: ThreadResumeParams) {
  if (isTauri()) {
    return await invokeTauri<ThreadResumeResponse>('resume_thread', { params });
  }
  return await postJson<ThreadResumeResponse>('/api/codex/thread/resume', params);
}

export async function turnStart(params: TurnStartParams) {
  if (isTauri()) {
    return await invokeTauri<TurnStartResponse>('turn_start', { params });
  }
  return await postJson<TurnStartResponse>('/api/codex/turn/start', params);
}

export async function turnInterrupt(params: TurnInterruptParams) {
  if (isTauri()) {
    return await invokeTauri('turn_interrupt', { params });
  }
  return await postJson('/api/codex/turn/interrupt', params);
}

export async function threadList(params: ThreadListParams, cwd?: string) {
  if (isTauri()) {
    return await invokeTauri<ThreadListResponse>('list_threads', { params, cwd });
  }
  return await postJson<ThreadListResponse>('/api/codex/thread/list', { ...params, cwd });
}

export async function threadListArchived(params: ThreadListParams) {
  if (isTauri()) {
    return await invokeTauri<ThreadListResponse>('list_archived_threads', { params });
  }
  return await postJson<ThreadListResponse>('/api/codex/thread/list-archived', params);
}

export async function threadArchive(threadId: ThreadId) {
  if (isTauri()) {
    return await invokeTauri('archive_thread', { threadId });
  }
  return await postJson('/api/codex/thread/archive', { thread_id: threadId });
}

export async function skillList(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<SkillsListResponse>('skills_list', { cwd });
  }
  return await postJson<SkillsListResponse>('/api/codex/skills/list', { cwd });
}

export async function cloneSkillsRepo(url: string) {
  if (isTauri()) {
    return await invokeTauri<string>('clone_skills_repo', { url });
  }
  toast({
    title: 'cloneSkillsRepo is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('cloneSkillsRepo is only available in Tauri mode.'));
}

export async function listMarketplaceSkills(
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
    return await invokeTauri<Array<MarketplaceSkillItem>>('list_marketplace_skills', {
      selectedAgent,
      scope,
      cwd,
    });
  }
  toast({
    title: 'listMarketplaceSkills is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('listMarketplaceSkills is only available in Tauri mode.'));
}

export async function listInstalledSkills(
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
    return await invokeTauri<Array<InstalledSkillItem>>('list_installed_skills', {
      selectedAgent,
      scope,
      cwd,
    });
  }
  toast({
    title: 'listInstalledSkills is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('listInstalledSkills is only available in Tauri mode.'));
}

export async function installMarketplaceSkill(
  skillMdPath: string,
  skillName: string,
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
    return await invokeTauri<string>('install_marketplace_skill', {
      skillMdPath,
      skillName,
      selectedAgent,
      scope,
      cwd,
    });
  }
  toast({
    title: 'installMarketplaceSkill is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('installMarketplaceSkill is only available in Tauri mode.'));
}

export async function uninstallInstalledSkill(
  skillName: string,
  selectedAgent: SkillAgent,
  scope: SkillScope,
  cwd?: string
) {
  if (isTauri()) {
    return await invokeTauri<string>('uninstall_installed_skill', {
      skillName,
      selectedAgent,
      scope,
      cwd,
    });
  }
  toast({
    title: 'uninstallInstalledSkill is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('uninstallInstalledSkill is only available in Tauri mode.'));
}

export async function fuzzyFileSearch(params: FuzzyFileSearchParams) {
  if (isTauri()) {
    return await invokeTauri<FuzzyFileSearchResponse>('fuzzy_file_search', { params });
  }
  return await postJson<FuzzyFileSearchResponse>('/api/codex/search/fuzzy-file', params);
}

export async function skillsConfigWrite(path: string, enabled: boolean) {
  if (isTauri()) {
    return await invokeTauri('skills_config_write', { path, enabled });
  }
  return await postJson('/api/codex/skills/config/write', { path, enabled });
}

export async function loginChatGpt() {
  if (isTauri()) {
    return await invokeTauri<LoginChatGptResponse>('login_chatgpt');
  }
  toast({
    title: 'loginChatGpt is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('loginChatGpt is only available in Tauri mode.'));
}

export async function getAccount() {
  return await getAccountWithParams({ refreshToken: false });
}

export async function getAccountWithParams(params: GetAccountParams) {
  if (isTauri()) {
    return await invokeTauri<GetAccountResponse>('get_account', { params });
  }
  return await postJson<GetAccountResponse>('/api/codex/account/get', params);
}

export async function loginAccount(params: LoginAccountParams) {
  if (isTauri()) {
    return await invokeTauri<LoginAccountResponse>('login_account', { params });
  }
  return await postJson<LoginAccountResponse>('/api/codex/account/login', params);
}

export async function cancelLoginAccount(params: CancelLoginAccountParams) {
  if (isTauri()) {
    return await invokeTauri<CancelLoginAccountResponse>('cancel_login_account', { params });
  }
  return await postJson<CancelLoginAccountResponse>('/api/codex/account/login/cancel', params);
}

export async function logoutAccount() {
  if (isTauri()) {
    return await invokeTauri<LogoutAccountResponse>('logout_account');
  }
  return await postJson<LogoutAccountResponse>('/api/codex/account/logout');
}

export async function reviewStart(params: ReviewStartParams) {
  if (isTauri()) {
    return await invokeTauri<ReviewStartResponse>('start_review', { params });
  }
  return await postJson<ReviewStartResponse>('/api/codex/review/start', params);
}

export async function getAccountRateLimits() {
  if (isTauri()) {
    return await invokeTauri<GetAccountRateLimitsResponse>('account_rate_limits');
  }
  return await getJson<GetAccountRateLimitsResponse>('/api/codex/account/rate-limits');
}

export async function respondToRequestUserInput(
  requestId: RequestId,
  response: ToolRequestUserInputResponse
) {
  if (isTauri()) {
    return await invokeTauri('respond_to_request_user_input', { requestId, response });
  }
  return await postNoContent('/api/codex/approval/user-input', {
    request_id: requestId,
    response,
  });
}

export async function respondToCommandExecutionApproval(
  requestId: RequestId,
  decision: CommandExecutionApprovalDecision
) {
  if (isTauri()) {
    return await invokeTauri('respond_to_command_execution_approval', { requestId, decision });
  }
  return await postNoContent('/api/codex/approval/command-execution', {
    request_id: requestId,
    decision,
  });
}

export async function respondToFileChangeApproval(
  requestId: RequestId,
  decision: FileChangeApprovalDecision
) {
  if (isTauri()) {
    return await invokeTauri('respond_to_file_change_approval', { requestId, decision });
  }
  return await postNoContent('/api/codex/approval/file-change', {
    request_id: requestId,
    decision,
  });
}

export type TauriFileEntry = {
  name: string;
  path: string;
  is_directory: boolean;
  size: number | null;
  extension: string | null;
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

export async function gitStatus(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<GitStatusResponse>('git_status', { cwd });
  }
  toast({
    title: 'gitStatus is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('gitStatus is only available in Tauri mode.'));
}

export async function gitFileDiff(cwd: string, filePath: string, staged: boolean) {
  if (isTauri()) {
    return await invokeTauri<GitFileDiffResponse>('git_file_diff', { cwd, filePath, staged });
  }
  toast({
    title: 'gitFileDiff is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('gitFileDiff is only available in Tauri mode.'));
}

export async function gitFileDiffMeta(cwd: string, filePath: string, staged: boolean) {
  if (isTauri()) {
    return await invokeTauri<GitFileDiffMetaResponse>('git_file_diff_meta', {
      cwd,
      filePath,
      staged,
    });
  }
  toast({
    title: 'gitFileDiffMeta is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('gitFileDiffMeta is only available in Tauri mode.'));
}

export async function gitDiffStats(cwd: string) {
  if (isTauri()) {
    return await invokeTauri<GitDiffStatsResponse>('git_diff_stats', { cwd });
  }
  toast({
    title: 'gitDiffStats is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('gitDiffStats is only available in Tauri mode.'));
}

export async function gitStageFiles(cwd: string, filePaths: string[]) {
  if (isTauri()) {
    return await invokeTauri<void>('git_stage_files', { cwd, filePaths });
  }
  toast({
    title: 'gitStageFiles is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('gitStageFiles is only available in Tauri mode.'));
}

export async function gitUnstageFiles(cwd: string, filePaths: string[]) {
  if (isTauri()) {
    return await invokeTauri<void>('git_unstage_files', { cwd, filePaths });
  }
  toast({
    title: 'gitUnstageFiles is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('gitUnstageFiles is only available in Tauri mode.'));
}

export type TerminalStartResponse = {
  session_id: string;
  shell: string;
};

export async function terminalStart(cwd?: string | null, cols?: number, rows?: number) {
  if (isTauri()) {
    return await invokeTauri<TerminalStartResponse>('terminal_start', { cwd, cols, rows });
  }
  toast({
    title: 'terminalStart is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('terminalStart is only available in Tauri mode.'));
}

export async function terminalWrite(sessionId: string, data: string) {
  if (isTauri()) {
    await invokeTauri<void>('terminal_write', { params: { session_id: sessionId, data } });
    return;
  }
  toast({
    title: 'terminalWrite is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('terminalWrite is only available in Tauri mode.'));
}

export async function terminalResize(sessionId: string, cols: number, rows: number) {
  if (isTauri()) {
    await invokeTauri<void>('terminal_resize', {
      params: { session_id: sessionId, cols, rows },
    });
    return;
  }
  toast({
    title: 'terminalResize is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('terminalResize is only available in Tauri mode.'));
}

export async function terminalStop(sessionId: string) {
  if (isTauri()) {
    await invokeTauri<void>('terminal_stop', { params: { session_id: sessionId } });
    return;
  }
  toast({
    title: 'terminalStop is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('terminalStop is only available in Tauri mode.'));
}

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

export async function readFile(filePath: string) {
  if (isTauri()) {
    return await invokeTauri<string>('read_file', { filePath });
  }
  return await postJson<string>('/api/codex/filesystem/read-file', { filePath });
}

export async function getCodexHome() {
  if (isTauri()) {
    return await invokeTauri<string>('codex_home');
  }
  return await getJson<string>('/api/codex/filesystem/codex-home');
}

export async function writeFile(filePath: string, content: string) {
  if (isTauri()) {
    await invokeTauri('write_file', { filePath, content });
    return;
  }
  await postNoContent('/api/codex/filesystem/write-file', { filePath, content });
}

export async function readDirectory(path: string) {
  if (isTauri()) {
    return await invokeTauri<TauriFileEntry[]>('read_directory', { path });
  }
  return await postJson<TauriFileEntry[]>('/api/codex/filesystem/read-directory', { path });
}

export async function getDefaultDirectories() {
  if (isTauri()) {
    return await invokeTauri<string[]>('get_default_directories');
  }
  return await getJson<string[]>('/api/codex/filesystem/default-directories');
}

export async function canonicalizePath(path: string) {
  if (isTauri()) {
    return await invokeTauri<string>('canonicalize_path', { path });
  }
  return await postJson<string>('/api/codex/filesystem/canonicalize-path', { path });
}

export async function deleteFile(filePath: string) {
  if (isTauri()) {
    await invokeTauri('delete_file', { filePath });
    return;
  }
  await postNoContent('/api/codex/filesystem/delete-file', { filePath });
}

export async function createNote(
  id: string,
  title: string,
  content: string,
  tags?: string[],
  userId?: string | null
) {
  if (isTauri()) {
    return await invokeTauri<DbNote>('create_note', { id, userId, title, content, tags });
  }
  return await postJson<DbNote>('/api/codex/notes/create', {
    id,
    user_id: userId ?? null,
    title,
    content,
    tags: tags ?? null,
  });
}

export async function getNotes(userId?: string | null) {
  if (isTauri()) {
    return await invokeTauri<DbNote[]>('get_notes', { userId });
  }
  return await postJson<DbNote[]>('/api/codex/notes/list', { user_id: userId ?? null });
}

export async function getNoteById(id: string) {
  if (isTauri()) {
    return await invokeTauri<DbNote | null>('get_note_by_id', { id });
  }
  return await postJson<DbNote | null>('/api/codex/notes/get', { id });
}

export async function updateNote(
  id: string,
  payload: { title?: string; content?: string; tags?: string[] }
) {
  if (isTauri()) {
    await invokeTauri('update_note', { id, ...payload });
    return;
  }
  await postNoContent('/api/codex/notes/update', { id, ...payload });
}

export async function deleteNote(id: string) {
  if (isTauri()) {
    await invokeTauri('delete_note', { id });
    return;
  }
  await postNoContent('/api/codex/notes/delete', { id });
}

export async function toggleFavorite(id: string) {
  if (isTauri()) {
    await invokeTauri('toggle_favorite', { id });
    return;
  }
  await postNoContent('/api/codex/notes/toggle-favorite', { id });
}

export async function threadUnarchive(threadId: ThreadId) {
  if (isTauri()) {
    return await invokeTauri('thread_unarchive', { threadId });
  }
  return await postJson('/api/codex/thread/unarchive', { thread_id: threadId });
}

const SESSION_META_STORAGE_KEY = 'codexia.session_meta';
const SESSION_META_FILE_PATH = '~/.plux/session_meta.json';

export async function readSessionMetaFile(): Promise<string> {
  if (isTauri()) {
    return await invokeTauri<string>('read_file', { filePath: SESSION_META_FILE_PATH });
  }
  return window.localStorage.getItem(SESSION_META_STORAGE_KEY) ?? '{}';
}

export async function writeSessionMetaFile(content: string): Promise<void> {
  if (isTauri()) {
    return await invokeTauri<void>('write_file', { filePath: SESSION_META_FILE_PATH, content });
  }
  window.localStorage.setItem(SESSION_META_STORAGE_KEY, content);
}
