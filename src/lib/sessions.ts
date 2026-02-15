import { ccGetProjects, ccGetSessions } from '@/services';

export interface SessionData {
  project: string;
  display: string;
  timestamp: number;
  sessionId: string;
}

export async function getProjects(): Promise<string[]> {
  try {
    return await ccGetProjects();
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
    return await ccGetSessions<SessionData[]>();
  } catch (err) {
    console.debug('Failed to get sessions:', err);
    return [];
  }
}
