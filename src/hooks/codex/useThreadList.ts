import { useCallback, useEffect } from 'react';
import { codexService } from '@/services/codexService';
import { useCodexStore, useThreadListStore } from '@/stores/codex';
import { useLayoutStore, useNoteStore, useWorkspaceStore } from '@/stores';

export function useThreadList() {
  const { cwd, historyMode } = useWorkspaceStore();
  const { setView } = useLayoutStore();
  const { setSelectedNoteId } = useNoteStore();
  const { threadListRefreshToken } = useCodexStore();
  const { searchTerm, setSearchTerm, sortKey, setSortKey } = useThreadListStore();

  const handleNewThread = useCallback(async () => {
    setSelectedNoteId(null);
    setView(historyMode ? 'history' : 'codex');
    await codexService.setCurrentThread(null);
  }, [historyMode, setView, setSelectedNoteId]);

  useEffect(() => {
    codexService.loadThreads(cwd, false, sortKey);
  }, [cwd, sortKey, threadListRefreshToken]);

  return { searchTerm, setSearchTerm, sortKey, setSortKey, handleNewThread };
}
