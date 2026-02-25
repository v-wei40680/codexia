import { ccGetProjects, ccGetSessions } from '@/services';

export interface SessionData {
  project: string;
  display: string;
  timestamp: number;
  sessionId: string;
}

type SessionDataRaw = SessionData & { session_id?: string };

function normalizeSession(data: SessionDataRaw): SessionData {
  return {
    project: data.project,
    display: data.display,
    timestamp: data.timestamp,
    sessionId: data.sessionId ?? data.session_id ?? '',
  };
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
    const sessions = await ccGetSessions<SessionDataRaw[]>();
    return sessions
      .map(normalizeSession)
      .filter((session) => Boolean(session.sessionId));
  } catch (err) {
    console.debug('Failed to get sessions:', err);
    return [];
  }
}
