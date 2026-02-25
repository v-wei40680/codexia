import { invokeTauri, isTauri, postJson, postNoContent } from './shared';

export type AutomationScheduleMode = 'daily' | 'interval';
export type AutomationWeekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type AutomationSchedule = {
  mode: AutomationScheduleMode;
  hour?: number | null;
  minute?: number | null;
  interval_hours?: number | null;
  weekdays: AutomationWeekday[];
};

export type AutomationTask = {
  id: string;
  name: string;
  projects: string[];
  prompt: string;
  agent: 'codex' | 'cc';
  model_provider: 'openai' | 'ollama';
  model: string;
  schedule: AutomationSchedule;
  cron_expression: string;
  created_at: string;
  paused: boolean;
};

export type AutomationRun = {
  run_id: string;
  task_id: string;
  task_name: string;
  thread_id: string;
  status: string;
  started_at: string;
  updated_at: string;
};

export async function listAutomations() {
  if (isTauri()) {
    return await invokeTauri<AutomationTask[]>('list_automations');
  }
  return await postJson<AutomationTask[]>('/api/automation/list', {});
}

export async function listAutomationRuns(payload?: { task_id?: string; limit?: number }) {
  const params = { task_id: payload?.task_id ?? null, limit: payload?.limit ?? 100 };
  if (isTauri()) {
    return await invokeTauri<AutomationRun[]>('list_automation_runs', params);
  }
  return await postJson<AutomationRun[]>('/api/automation/runs/list', params);
}

export async function createAutomation(payload: {
  name: string;
  projects: string[];
  prompt: string;
  schedule: AutomationSchedule;
  agent?: 'codex' | 'cc';
  model_provider?: 'openai' | 'ollama';
  model?: string;
}) {
  if (isTauri()) {
    return await invokeTauri<AutomationTask>('create_automation', {
      ...payload,
      modelProvider: payload.model_provider,
    });
  }
  return await postJson<AutomationTask>('/api/automation/create', payload);
}

export async function updateAutomation(payload: {
  id: string;
  name: string;
  projects: string[];
  prompt: string;
  schedule: AutomationSchedule;
  agent?: 'codex' | 'cc';
  model_provider?: 'openai' | 'ollama';
  model?: string;
}) {
  if (isTauri()) {
    return await invokeTauri<AutomationTask>('update_automation', {
      ...payload,
      modelProvider: payload.model_provider,
    });
  }
  return await postJson<AutomationTask>('/api/automation/update', payload);
}

export async function setAutomationPaused(id: string, paused: boolean) {
  if (isTauri()) {
    return await invokeTauri<AutomationTask>('set_automation_paused', { id, paused });
  }
  return await postJson<AutomationTask>('/api/automation/set-paused', { id, paused });
}

export async function deleteAutomation(id: string) {
  if (isTauri()) {
    await invokeTauri<void>('delete_automation', { id });
    return;
  }
  await postNoContent('/api/automation/delete', { id });
}

export async function runAutomationNow(id: string) {
  if (isTauri()) {
    await invokeTauri<void>('run_automation_now', { id });
    return;
  }
  await postNoContent('/api/automation/run-now', { id });
}
