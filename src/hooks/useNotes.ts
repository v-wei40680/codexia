import { useEffect } from 'react';
import { useNoteStore } from '@/stores/useNoteStore';

export type NoteSummary = {
  id: string;
  title: string;
  preview: string;
  tags: string[];
  mtime: number;
  isFavorited: boolean;
};

export function useNotes() {
  const { notes, loading, error, hasLoaded, loadNotes } = useNoteStore();

  useEffect(() => {
    if (!hasLoaded) {
      void loadNotes();
    }
  }, [hasLoaded, loadNotes]);

  return { notes, loading, error, refresh: loadNotes, hasLoaded };
}
