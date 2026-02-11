import { create } from 'zustand';

type NoteViewMode = 'list' | 'editor';

interface NoteStore {
  selectedNoteId: string | null;
  viewMode: NoteViewMode;
  setSelectedNoteId: (noteId: string | null) => void;
  setViewMode: (viewMode: NoteViewMode) => void;
  openEditor: (noteId: string | null) => void;
  closeEditor: () => void;
}

export const useNoteStore = create<NoteStore>((set) => ({
  selectedNoteId: null,
  viewMode: 'list',
  setSelectedNoteId: (noteId) => set({ selectedNoteId: noteId }),
  setViewMode: (viewMode) => set({ viewMode }),
  openEditor: (noteId) => set({ selectedNoteId: noteId, viewMode: 'editor' }),
  closeEditor: () => set({ viewMode: 'list' }),
}));
