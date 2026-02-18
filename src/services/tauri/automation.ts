import { invokeTauri, isTauri, postJson, postNoContent } from './shared';

export type AutomationScheduleMode = 'daily' | 'interval';
export type AutomationWeekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type AutomationSchedule = {
  mode: AutomationScheduleMode;
  hour?: number | null;
  interval_hours?: number | null;
  weekdays: AutomationWeekday[];
};

export type AutomationTask = {
  id: string;
  name: string;
  projects: string[];
  prompt: string;
  access_mode: 'agent';
  schedule: AutomationSchedule;
  cron_expression: string;
  created_at: string;
  paused: boolean;
};

export async function listAutomations() {
  if (isTauri()) {
    return await invokeTauri<AutomationTask[]>('list_automations');
  }
  return await postJson<AutomationTask[]>('/api/automation/list', {});
}

export async function createAutomation(payload: {
  name: string;
  projects: string[];
  prompt: string;
  schedule: AutomationSchedule;
  access_mode?: 'agent';
}) {
  if (isTauri()) {
    return await invokeTauri<AutomationTask>('create_automation', payload);
  }
  return await postJson<AutomationTask>('/api/automation/create', payload);
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
