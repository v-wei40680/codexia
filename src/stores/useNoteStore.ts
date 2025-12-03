import { v4 } from "uuid";
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

// Database Note type (matches Rust)
interface DbNote {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  tags: string[] | null;
  is_favorited: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  synced_at: string | null;
}

// Frontend Note type (compatible with old version)
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  isFavorited?: boolean;
}

interface NoteStore {
  notes: Note[];
  currentNoteId: string | null;
  isLoading: boolean;
  migrated: boolean;

  // Actions
  loadNotes: () => Promise<void>;
  createNote: (title?: string, content?: string) => Promise<Note>;
  updateNote: (
    id: string,
    updates: Partial<Pick<Note, "title" | "content" | "tags">>
  ) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  setCurrentNote: (id: string | null) => void;
  addContentToNote: (id: string, content: string, source?: string) => Promise<void>;
  createNoteFromContent: (content: string, source?: string) => Promise<Note>;
  toggleFavorite: (id: string) => Promise<void>;

  // Getters
  getCurrentNote: () => Note | null;
  getNoteById: (id: string) => Note | null;
}

const generateTitle = (content: string): string => {
  if (!content.trim()) return "New Note";

  // Take first line or first 50 characters as title
  const firstLine = content.split("\n")[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 50) {
    return firstLine;
  }

  const truncated = content.trim().substring(0, 50);
  return truncated.length < content.trim().length
    ? `${truncated}...`
    : truncated;
};

// Convert DB note to frontend note
const dbToFrontend = (dbNote: DbNote): Note => ({
  id: dbNote.id,
  title: dbNote.title,
  content: dbNote.content,
  createdAt: new Date(dbNote.created_at).getTime(),
  updatedAt: new Date(dbNote.updated_at).getTime(),
  tags: dbNote.tags || undefined,
  isFavorited: dbNote.is_favorited,
});

// Migrate old localStorage notes to database
const migrateOldNotes = async (): Promise<boolean> => {
  try {
    const oldDataStr = localStorage.getItem("plux-notes-storage");
    if (!oldDataStr) return false;

    const oldData = JSON.parse(oldDataStr);
    const oldNotes: Note[] = oldData?.state?.notes || [];

    if (oldNotes.length === 0) return false;

    console.log(`[NoteStore] Migrating ${oldNotes.length} notes from localStorage...`);

    // Migrate each note to database
    for (const note of oldNotes) {
      try {
        await invoke("create_note", {
          id: note.id,
          userId: null,
          title: note.title,
          content: note.content,
          tags: note.tags || null,
        });

        // Set favorite status if needed
        if (note.isFavorited) {
          await invoke("toggle_note_favorite", { id: note.id });
        }
      } catch (err) {
        console.error(`[NoteStore] Failed to migrate note ${note.id}:`, err);
      }
    }

    // Mark as migrated in localStorage
    localStorage.setItem("plux-notes-migrated", "true");
    console.log("[NoteStore] Migration completed successfully");

    return true;
  } catch (err) {
    console.error("[NoteStore] Migration failed:", err);
    return false;
  }
};

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  currentNoteId: null,
  isLoading: false,
  migrated: false,

  loadNotes: async () => {
    try {
      set({ isLoading: true });

      // Check if migration is needed
      const migrated = localStorage.getItem("plux-notes-migrated") === "true";
      if (!migrated) {
        await migrateOldNotes();
      }

      // Load notes from database
      const dbNotes: DbNote[] = await invoke("get_notes", { userId: null });
      const notes = dbNotes.map(dbToFrontend);

      // Sort by updatedAt descending
      notes.sort((a, b) => b.updatedAt - a.updatedAt);

      set({ notes, isLoading: false, migrated: true });
    } catch (err) {
      console.error("[NoteStore] Failed to load notes:", err);
      set({ isLoading: false });
    }
  },

  createNote: async (title, content = "") => {
    const id = v4();
    const generatedTitle = title || generateTitle(content) || "New Note";

    try {
      const dbNote: DbNote = await invoke("create_note", {
        id,
        userId: null,
        title: generatedTitle,
        content,
        tags: null,
      });

      const note = dbToFrontend(dbNote);

      set((state) => ({
        notes: [note, ...state.notes],
        currentNoteId: note.id,
      }));

      return note;
    } catch (err) {
      console.error("[NoteStore] Failed to create note:", err);
      throw err;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const currentNote = get().getNoteById(id);
      if (!currentNote) return;

      const newTitle =
        updates.title ||
        (updates.content ? generateTitle(updates.content) : currentNote.title);

      await invoke("update_note", {
        id,
        title: updates.title !== undefined ? newTitle : null,
        content: updates.content !== undefined ? updates.content : null,
        tags: updates.tags !== undefined ? updates.tags : null,
      });

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id
            ? {
                ...note,
                ...updates,
                title: newTitle,
                updatedAt: Date.now(),
              }
            : note
        ),
      }));
    } catch (err) {
      console.error("[NoteStore] Failed to update note:", err);
      throw err;
    }
  },

  deleteNote: async (id) => {
    try {
      await invoke("delete_note", { id });

      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        currentNoteId: state.currentNoteId === id ? null : state.currentNoteId,
      }));
    } catch (err) {
      console.error("[NoteStore] Failed to delete note:", err);
      throw err;
    }
  },

  setCurrentNote: (id) => {
    set({ currentNoteId: id });
  },

  addContentToNote: async (id, content, source) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = source ? `[${source} - ${timestamp}]\n` : `[${timestamp}]\n`;

    const currentNote = get().getNoteById(id);
    if (!currentNote) return;

    const newContent = currentNote.content
      ? `${currentNote.content}\n\n${prefix}${content}`
      : `${prefix}${content}`;

    await get().updateNote(id, { content: newContent });
  },

  createNoteFromContent: async (content, source) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = source ? `[${source} - ${timestamp}]\n` : `[${timestamp}]\n`;
    const noteContent = `${prefix}${content}`;

    return get().createNote(undefined, noteContent);
  },

  getCurrentNote: () => {
    const { notes, currentNoteId } = get();
    return currentNoteId
      ? notes.find((note) => note.id === currentNoteId) || null
      : null;
  },

  getNoteById: (id) => {
    const { notes } = get();
    return notes.find((note) => note.id === id) || null;
  },

  toggleFavorite: async (id) => {
    try {
      await invoke("toggle_note_favorite", { id });

      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, isFavorited: !note.isFavorited } : note
        ),
      }));
    } catch (err) {
      console.error("[NoteStore] Failed to toggle favorite:", err);
      throw err;
    }
  },
}));

// Auto-load notes on store creation
if (typeof window !== "undefined") {
  useNoteStore.getState().loadNotes();
}
