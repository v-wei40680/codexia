import { useCallback, useEffect, useState } from 'react';
import { getNotes } from '@/services/tauri';

export type NoteSummary = {
  id: string;
  title: string;
  preview: string;
  tags: string[];
  mtime: number;
  isFavorited: boolean;
};

const getPreview = (content: string) => {
  const lines = content.split(/\r?\n/);
  const preview = lines.slice(1).join(' ').trim().substring(0, 100) || 'No additional content';
  return preview;
};

export function useNotes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dbNotes = await getNotes(null);
      const summaries = dbNotes.map((note) => ({
        id: note.id,
        title: note.title || 'Untitled note',
        preview: getPreview(note.content),
        tags: note.tags ?? [],
        mtime: Date.parse(note.updated_at) || 0,
        isFavorited: note.is_favorited,
      }));
      setNotes(summaries);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to load notes.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  return { notes, loading, error, refresh: loadNotes, hasLoaded };
}
