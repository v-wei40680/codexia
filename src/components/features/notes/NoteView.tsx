import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNoteStore } from '@/stores/useNoteStore';
import { NoteList } from './NoteList';
import { NoteEditor } from './NoteEditor';
import { useThemeContext } from '@/contexts/ThemeContext';
import { useNotes } from '@/hooks/useNotes';
import { useInputStore } from '@/stores/useInputStore';
import { ArrowLeft, Plus, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { v4 as uuidv4 } from 'uuid';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MDEditor from '@uiw/react-md-editor';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { loadInstructionFile, saveInstructionFile } from '@/utils/instructionFile';
import { createNote, deleteNote, getNoteById, toggleFavorite } from '@/services/tauri';

export function NoteView() {
  const { selectedNoteId, setSelectedNoteId, viewMode, openEditor, closeEditor } = useNoteStore();
  const { appendInputValue } = useInputStore();
  const { resolvedTheme } = useThemeContext();
  const { notes, loading, error, refresh } = useNotes();
  const { cwd } = useWorkspaceStore();
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [editorFocusToken, setEditorFocusToken] = useState(0);
  const [activeTab, setActiveTab] = useState<'notes' | 'instruction'>('notes');
  const [instructions, setInstructions] = useState('');
  const [instructionLoadError, setInstructionLoadError] = useState<string | null>(null);
  const [instructionSaveError, setInstructionSaveError] = useState<string | null>(null);
  const [isInstructionSaving, setIsInstructionSaving] = useState(false);

  const instructionPath = useMemo(() => (cwd ? `${cwd}/AGENTS.md` : ''), [cwd]);

  const filteredNotes = useMemo(() => {
    const scopedNotes =
      filterMode === 'favorites' ? notes.filter((note) => note.isFavorited) : notes;

    if (!search) {
      return scopedNotes;
    }
    const lowerSearch = search.toLowerCase();
    return scopedNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerSearch) ||
        note.preview.toLowerCase().includes(lowerSearch) ||
        note.tags.some((tag) => tag.toLowerCase().includes(lowerSearch))
    );
  }, [notes, search, filterMode]);

  const handleAppendToChat = async (e: MouseEvent, noteId: string) => {
    e.stopPropagation();
    try {
      const note = await getNoteById(noteId);
      if (note) {
        appendInputValue(note.content);
      }
    } catch (err) {
      console.error('Failed to append note:', err);
    }
  };

  const handleCreateNote = useCallback(async () => {
    const noteId = uuidv4();
    const content = '# New note';
    const title = 'New note';
    try {
      await createNote(noteId, title, content, []);
      await refresh();
      openEditor(noteId);
      setEditorFocusToken((prev) => prev + 1);
      return true;
    } catch (err) {
      console.error('Failed to create note:', err);
      return false;
    }
  }, [refresh, openEditor]);

  const handleToggleFavorite = async (event: MouseEvent, noteId: string) => {
    event.stopPropagation();
    try {
      await toggleFavorite(noteId);
      await refresh();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadInstructions = async () => {
      setInstructionLoadError(null);
      if (!instructionPath) {
        if (isActive) {
          setInstructions('');
        }
        return;
      }
      try {
        const result = await loadInstructionFile({
          path: instructionPath,
          autoCreate: true,
        });
        if (isActive) {
          setInstructions(result.content);
        }
      } catch (err) {
        if (isActive) {
          setInstructions('');
          const message = err instanceof Error ? err.message : String(err);
          setInstructionLoadError(message || 'Failed to load instructions.');
        }
      }
    };

    void loadInstructions();

    return () => {
      isActive = false;
    };
  }, [instructionPath]);

  const handleInstructionSave = async () => {
    if (!instructionPath) {
      return;
    }
    setInstructionSaveError(null);
    setIsInstructionSaving(true);
    try {
      await saveInstructionFile({
        path: instructionPath,
        content: instructions,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setInstructionSaveError(message || 'Failed to save instructions.');
    } finally {
      setIsInstructionSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
        closeEditor();
      }
      await refresh();
    } catch (err) {
      console.error('Failed to delete note:', err);
    } finally {
      setIsDeleting(false);
      setNoteToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'notes' | 'instruction')}
        className="flex h-full w-full flex-col"
      >
        <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-sidebar/5">
          <div className="flex items-center gap-2">
            {activeTab === 'notes' && viewMode === 'editor' && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={closeEditor}
                title="Back to list"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <TabsList className="h-8">
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="instruction">Instruction</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-1">
            {activeTab === 'notes' ? (
              viewMode === 'editor' ? (
                selectedNoteId ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => setNoteToDelete(selectedNoteId)}
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null
              ) : (
                <Button
                  onClick={() => void handleCreateNote()}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="New note"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )
            ) : (
              <Button onClick={handleInstructionSave} disabled={isInstructionSaving || !cwd}>
                {isInstructionSaving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        </header>

        <TabsContent value="notes" className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {viewMode === 'editor' ? (
            <div className="flex-1 min-h-0 flex flex-col" data-color-mode={resolvedTheme}>
              <NoteEditor
                key={selectedNoteId}
                noteId={selectedNoteId}
                focusToken={editorFocusToken}
                onSaved={refresh}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col border-t border-white/10 bg-sidebar/10">
              <div className="px-3 py-2 space-y-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant={filterMode === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7"
                    onClick={() => setFilterMode('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterMode === 'favorites' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7"
                    onClick={() => setFilterMode('favorites')}
                  >
                    Favorites
                  </Button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search notes..."
                    className="pl-8 pr-8 h-9 bg-background/50 border-none ring-offset-background focus-visible:ring-1 focus-visible:ring-ring"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setSearch('')}
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <NoteList
                  notes={filteredNotes}
                  selectedNoteId={selectedNoteId}
                  loading={loading}
                  error={error}
                  search={search}
                  onSelect={(noteId) => openEditor(noteId)}
                  onAppendToChat={handleAppendToChat}
                  onToggleFavorite={handleToggleFavorite}
                  onCreate={handleCreateNote}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="instruction" className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex h-full flex-col">
            <div className="px-4 py-2 text-xs text-muted-foreground border-b border-white/10">
              {instructionPath || 'No working directory selected.'}
            </div>
            {instructionLoadError ? (
              <p className="px-4 py-2 text-xs text-muted-foreground">{instructionLoadError}</p>
            ) : null}
            <div className="flex-1 min-h-0 px-4 py-3" data-color-mode={resolvedTheme}>
              <MDEditor
                preview="edit"
                value={instructions}
                onChange={(next) => setInstructions(next ?? '')}
              />
            </div>
            {instructionSaveError ? (
              <p className="px-4 py-2 text-xs text-destructive">{instructionSaveError}</p>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        isOpen={!!noteToDelete}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={() => noteToDelete && handleDeleteNote(noteToDelete)}
        onCancel={() => setNoteToDelete(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
