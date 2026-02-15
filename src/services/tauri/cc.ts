import { invokeTauri, isTauri, postNoContent, postJson, getJson, toast } from './shared';

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
  toast({
    title: 'ccMcpAdd is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('ccMcpAdd is only available in Tauri mode.'));
}

export async function ccMcpList<T = unknown>(workingDir: string) {
  if (isTauri()) {
    return await invokeTauri<T>('cc_mcp_list', { workingDir });
  }
  toast({
    title: 'ccMcpList is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('ccMcpList is only available in Tauri mode.'));
}

export async function ccListProjects() {
  if (isTauri()) {
    return await invokeTauri<string[]>('cc_list_projects');
  }
  toast({
    title: 'ccListProjects is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('ccListProjects is only available in Tauri mode.'));
}

export async function ccMcpRemove(name: string, workingDir: string) {
  if (isTauri()) {
    await invokeTauri('cc_mcp_remove', { name, workingDir });
    return;
  }
  toast({
    title: 'ccMcpRemove is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('ccMcpRemove is only available in Tauri mode.'));
}

export async function ccMcpEnable(name: string, workingDir: string) {
  if (isTauri()) {
    await invokeTauri('cc_mcp_enable', { name, workingDir });
    return;
  }
  toast({
    title: 'ccMcpEnable is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('ccMcpEnable is only available in Tauri mode.'));
}

export async function ccMcpDisable(name: string, workingDir: string) {
  if (isTauri()) {
    await invokeTauri('cc_mcp_disable', { name, workingDir });
    return;
  }
  toast({
    title: 'ccMcpDisable is only available in Tauri mode.',
    variant: 'destructive',
  });
  return Promise.reject(new Error('ccMcpDisable is only available in Tauri mode.'));
}
