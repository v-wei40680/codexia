import type {
  GetAccountParams,
  GetAccountRateLimitsResponse,
  GetAccountResponse,
  LoginAccountParams,
  LoginAccountResponse,
  ModelListParams,
  ModelListResponse,
  ReviewStartParams,
  ReviewStartResponse,
  ThreadListParams,
  ThreadListResponse,
  ThreadResumeParams,
  ThreadResumeResponse,
  ThreadStartParams,
  ThreadStartResponse,
  ToolRequestUserInputResponse,
  TurnInterruptParams,
  TurnStartParams,
  TurnStartResponse,
} from '@/bindings/v2';
import type {
  CommandExecutionApprovalDecision,
  FileChangeApprovalDecision,
} from '@/bindings/v2';
import type {
  FuzzyFileSearchParams,
  FuzzyFileSearchResponse,
  LoginChatGptResponse,
  RequestId,
  ThreadId,
} from '@/bindings';

import {
  getJson,
  invokeTauri,
  isTauri,
  postJson,
  postNoContent,
  toast,
} from './shared';
export * from './mcp';
export * from './skills';

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

export async function threadUnarchive(threadId: ThreadId) {
  if (isTauri()) {
    return await invokeTauri('thread_unarchive', { threadId });
  }
  return await postJson('/api/codex/thread/unarchive', { thread_id: threadId });
}

export async function fuzzyFileSearch(params: FuzzyFileSearchParams) {
  if (isTauri()) {
    return await invokeTauri<FuzzyFileSearchResponse>('fuzzy_file_search', { params });
  }
  return await postJson<FuzzyFileSearchResponse>('/api/codex/search/fuzzy-file', params);
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

export async function preventSleep(conversationId?: string | null) {
  if (isTauri()) {
    return await invokeTauri<void>('prevent_sleep', { conversationId: conversationId ?? null });
  }
}

export async function allowSleep(conversationId?: string | null) {
  if (isTauri()) {
    return await invokeTauri<void>('allow_sleep', { conversationId: conversationId ?? null });
  }
}

export async function readTokenUsage<T = unknown>() {
  if (isTauri()) {
    return await invokeTauri<T>('read_token_usage');
  }
  return await getJson<T>('/api/codex/usage/token');
}
