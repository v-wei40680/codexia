import { readTextFileLines, BaseDirectory } from '@tauri-apps/plugin-fs';

export interface SessionData {
  project: string;
  display: string;
  timestamp: number;
  sessionId: string;
  pastedContents: Record<string, any>;
}

/**
 * Extract unique project paths from Claude Code session history
 */
export async function getProjectsFromSessions(): Promise<Set<string>> {
  const projects = new Set<string>();

  try {
    const lines = await readTextFileLines('.claude/history.jsonl', {
      baseDir: BaseDirectory.Home,
    });

    for await (const line of lines) {
      const sanitized = line.replace(/\u0000/g, '').trim();
      if (!sanitized) continue;

      if (!sanitized.endsWith('}')) {
        continue;
      }

      try {
        let data = JSON.parse(sanitized);

        // Handle double-encoded JSON strings
        if (typeof data === 'string') {
          data = JSON.parse(data);
        }

        if (data.project) {
          projects.add(data.project);
        }
      } catch {
        // Silently skip unparseable lines
      }
    }
  } catch (err) {
    // If file doesn't exist or can't be read, return empty set
    console.debug('Failed to read session history:', err);
  }

  return projects;
}

/**
 * Get all parsed sessions from history
 */
export async function getSessions(): Promise<SessionData[]> {
  const sessions: SessionData[] = [];

  try {
    const lines = await readTextFileLines('.claude/history.jsonl', {
      baseDir: BaseDirectory.Home,
    });

    for await (const line of lines) {
      const sanitized = line.replace(/\u0000/g, '').trim();
      if (!sanitized) continue;

      if (!sanitized.endsWith('}')) {
        continue;
      }

      try {
        let data = JSON.parse(sanitized);

        if (typeof data === 'string') {
          data = JSON.parse(data);
        }
        const slashCommands: string[] = ["/ide", "/model", "/status"]
        if (data.project && data.sessionId && !slashCommands.includes(data.display.trim())) {
          sessions.unshift({
            project: data.project,
            display: data.display || 'Untitled',
            timestamp: data.timestamp || Date.now(),
            sessionId: data.sessionId,
            pastedContents: data.pastedContents || {},
          });
        }
      } catch {
        // Silently skip unparseable lines
      }
    }
  } catch (err) {
    console.debug('Failed to read session history:', err);
  }

  return sessions;
}
