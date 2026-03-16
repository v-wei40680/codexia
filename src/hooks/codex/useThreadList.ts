import { useCallback, useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { codexService } from '@/services/codexService';
import { useCodexStore, useThreadListStore } from '@/stores/codex';
import { useAgentCenterStore, useLayoutStore, useNoteStore, useWorkspaceStore } from '@/stores';
import { isTauri } from '@/hooks/runtime';

interface UseThreadListOptions {
  enabled?: boolean;
}

export function useThreadList({ enabled = true }: UseThreadListOptions = {}) {
  const { cwd } = useWorkspaceStore();
  const { setCurrentAgentCardId } = useAgentCenterStore()
  const { setView } = useLayoutStore();
  const { setSelectedNoteId } = useNoteStore();
  const { threadListRefreshToken, triggerThreadListRefresh } = useCodexStore();
  const { searchTerm, setSearchTerm, sortKey, setSortKey } = useThreadListStore();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNewThread = useCallback(async () => {
    setSelectedNoteId(null);
    setCurrentAgentCardId(null);
    setView('agent');
    await codexService.setCurrentThread(null);
  }, [setView, setSelectedNoteId, setCurrentAgentCardId]);

  // Only listen for file changes and load threads when enabled (i.e. codex tab is active)
  useEffect(() => {
    if (!enabled) return;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        triggerThreadListRefresh();
      }, 150);
    };

    let unlisten: UnlistenFn | null = null;

    if (isTauri()) {
      void listen('thread/list-updated', () => {
        scheduleRefresh();
      }).then((dispose) => {
        unlisten = dispose;
      });

      return () => {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
        if (unlisten) {
          unlisten();
        }
      };
    }

    const onThreadListUpdated = () => {
      scheduleRefresh();
    };
    window.addEventListener('thread/list-updated', onThreadListUpdated as EventListener);
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.removeEventListener('thread/list-updated', onThreadListUpdated as EventListener);
    };
  }, [enabled, triggerThreadListRefresh]);

  useEffect(() => {
    if (!enabled) return;
    codexService.loadThreads(cwd, false, sortKey);
  }, [enabled, cwd, sortKey, threadListRefreshToken]);

  return { searchTerm, setSearchTerm, sortKey, setSortKey, handleNewThread };
}
