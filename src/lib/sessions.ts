import { invoke } from '@tauri-apps/api/core';

export interface SessionData {
  project: string;
  display: string;
  timestamp: number;
  sessionId: string;
}

export async function getProjects(): Promise<string[]> {
  try {
    return await invoke<string[]>('cc_get_projects');
  } catch (err) {
    console.debug('Failed to get projects:', err);
    return [];
  }
}

/**
 * Get all parsed sessions from backend database
 */
export async function getSessions(): Promise<SessionData[]> {
  try {
    return await invoke<SessionData[]>('cc_get_sessions');
  } catch (err) {
    console.debug('Failed to get sessions:', err);
    return [];
  }
}
