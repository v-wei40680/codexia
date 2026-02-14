const ZUSTAND_CLEANUP_FLAG_KEY = 'zustand-persist-cleanup-v3-done';

const ZUSTAND_PERSIST_RULES = [
  { key: 'auth-store', minVersion: 2 },
  { key: 'cc-store', minVersion: 2 },
  { key: 'codex-config-storage', minVersion: 2 },
  { key: 'input-storage', minVersion: 2 },
  { key: 'layout-storage', minVersion: 2 },
  { key: 'locale-storage', minVersion: 2 },
  { key: 'prompt-optimizer', minVersion: 2 },
  { key: 'settings-storage', minVersion: 3 },
  { key: 'theme-storage', minVersion: 2 },
  { key: 'thread-list-storage', minVersion: 2 },
  { key: 'workspace-store', minVersion: 2 },
] as const;

interface PersistedStorePayload {
  state?: unknown;
  version?: unknown;
}

function shouldRemovePersistedData(rawValue: string, minVersion: number): boolean {
  try {
    const payload = JSON.parse(rawValue) as PersistedStorePayload;
    const hasState = typeof payload === 'object' && payload !== null && 'state' in payload;
    const version = typeof payload?.version === 'number' ? payload.version : -1;
    return !hasState || version < minVersion;
  } catch {
    return true;
  }
}

export interface ZustandCleanupResult {
  removedKeys: string[];
}

export function cleanupLegacyZustandStores(): ZustandCleanupResult {
  if (typeof window === 'undefined') {
    return { removedKeys: [] };
  }

  try {
    if (window.localStorage.getItem(ZUSTAND_CLEANUP_FLAG_KEY) === 'true') {
      return { removedKeys: [] };
    }

    const removedKeys: string[] = [];

    for (const { key, minVersion } of ZUSTAND_PERSIST_RULES) {
      const rawValue = window.localStorage.getItem(key);
      if (!rawValue) {
        continue;
      }

      if (shouldRemovePersistedData(rawValue, minVersion)) {
        window.localStorage.removeItem(key);
        removedKeys.push(key);
      }
    }

    window.localStorage.setItem(ZUSTAND_CLEANUP_FLAG_KEY, 'true');
    return { removedKeys };
  } catch (error) {
    console.warn('Failed to cleanup legacy Zustand stores:', error);
    return { removedKeys: [] };
  }
}
