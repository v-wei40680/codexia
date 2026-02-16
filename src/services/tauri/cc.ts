import { invokeTauri, isTauri, postNoContent, postJson, getJson } from './shared';

export async function ccNewSession(options: Record<string, unknown>) {
  if (isTauri()) {
    return await invokeTauri<string>('cc_new_session', { options });
  }
  return await postJson<string>('/api/cc/new-session', { options });
}

export async function ccSendMessage(sessionId: string, message: string) {
  if (isTauri()) {
    await invokeTauri('cc_send_message', { sessionId, message });
    return;
  }
  await postNoContent('/api/cc/send-message', {
    session_id: sessionId,
    message,
  });
}

export async function ccInterrupt(sessionId: string) {
  if (isTauri()) {
    await invokeTauri('cc_interrupt', { sessionId });
    return;
  }
  await postNoContent('/api/cc/interrupt', { session_id: sessionId });
}

export async function ccResumeSession(sessionId: string, options: Record<string, unknown>) {
  if (isTauri()) {
    await invokeTauri('cc_resume_session', { sessionId, options });
    return;
  }
  await postNoContent('/api/cc/resume-session', { session_id: sessionId, options });
}

export async function ccGetInstalledSkills() {
  if (isTauri()) {
    return await invokeTauri<string[]>('cc_get_installed_skills');
  }
  return await getJson<string[]>('/api/cc/installed-skills');
}

export async function ccGetProjects() {
  if (isTauri()) {
    return await invokeTauri<string[]>('cc_get_projects');
  }
  return await getJson<string[]>('/api/cc/projects');
}

export async function ccGetSessions<T = unknown>() {
  if (isTauri()) {
    return await invokeTauri<T>('cc_get_sessions');
  }
  return await getJson<T>('/api/cc/sessions');
}

export async function ccGetSettings<T = unknown>() {
  if (isTauri()) {
    return await invokeTauri<T>('cc_get_settings');
  }
  return await getJson<T>('/api/cc/settings');
}

export async function ccUpdateSettings(settings: unknown) {
  if (isTauri()) {
    await invokeTauri('cc_update_settings', { settings });
    return;
  }
  await postNoContent('/api/cc/settings', { settings });
}

export async function ccMcpAdd(request: unknown, workingDir: string) {
  if (isTauri()) {
    await invokeTauri('cc_mcp_add', { request, workingDir });
    return;
  }
  await postJson('/api/cc/mcp/add', { request, working_dir: workingDir });
}

export async function ccMcpList<T = unknown>(workingDir: string) {
  if (isTauri()) {
    return await invokeTauri<T>('cc_mcp_list', { workingDir });
  }
  return await postJson<T>('/api/cc/mcp/list', { working_dir: workingDir });
}

export async function ccMcpGet<T = unknown>(name: string, workingDir: string) {
  if (isTauri()) {
    return await invokeTauri<T>('cc_mcp_get', { name, workingDir });
  }
  return await postJson<T>('/api/cc/mcp/get', { name, working_dir: workingDir });
}

export async function ccListProjects() {
  if (isTauri()) {
    return await invokeTauri<string[]>('cc_list_projects');
  }
  return await getJson<string[]>('/api/cc/mcp/projects');
}

export async function ccMcpRemove(name: string, workingDir: string, scope = 'local') {
  if (isTauri()) {
    await invokeTauri('cc_mcp_remove', { name, workingDir, scope });
    return;
  }
  await postJson('/api/cc/mcp/remove', { name, working_dir: workingDir, scope });
}

export async function ccMcpEnable(name: string, workingDir: string) {
  if (isTauri()) {
    await invokeTauri('cc_mcp_enable', { name, workingDir });
    return;
  }
  await postJson('/api/cc/mcp/enable', { name, working_dir: workingDir });
}

export async function ccMcpDisable(name: string, workingDir: string) {
  if (isTauri()) {
    await invokeTauri('cc_mcp_disable', { name, workingDir });
    return;
  }
  await postJson('/api/cc/mcp/disable', { name, working_dir: workingDir });
}
