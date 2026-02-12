import { useEffect, useCallback, useRef } from 'react';
import { watch } from '@tauri-apps/plugin-fs';
import type { UnlistenFn } from '@tauri-apps/api/event';

/**
 * Hook to watch .git/index file changes and trigger Git status refresh
 */
export function useGitWatch(cwd: string | null, onRefresh: () => void, enabled = true) {
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounced refresh to avoid too many calls
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      onRefresh();
    }, 300); // 300ms debounce
  }, [onRefresh]);

  useEffect(() => {
    if (!cwd || !enabled) return;

    const gitIndexPath = `${cwd}/.git/index`;

    // Watch .git/index file for changes
    const setupWatcher = async () => {
      try {
        const unlisten = await watch(
          gitIndexPath,
          () => {
            debouncedRefresh();
          },
          { recursive: false }
        );
        unlistenRef.current = unlisten;
      } catch (error) {
        console.error('Failed to watch .git/index:', error);
      }
    };

    // Keep a low-frequency fallback for platforms where file events may be missed.
    pollingRef.current = setInterval(() => {
      debouncedRefresh();
    }, 2500);

    setupWatcher();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [cwd, enabled, debouncedRefresh]);
}
