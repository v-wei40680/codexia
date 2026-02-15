import { type DbNote, invokeTauri, isTauri, postJson, postNoContent } from './shared';

export async function createNote(
  id: string,
  title: string,
  content: string,
  tags?: string[],
  userId?: string | null
) {
  if (isTauri()) {
    return await invokeTauri<DbNote>('create_note', { id, userId, title, content, tags });
  }
  return await postJson<DbNote>('/api/notes/create', {
    id,
    user_id: userId ?? null,
    title,
    content,
    tags: tags ?? null,
  });
}

export async function getNotes(userId?: string | null) {
  if (isTauri()) {
    return await invokeTauri<DbNote[]>('get_notes', { userId });
  }
  return await postJson<DbNote[]>('/api/notes/list', { user_id: userId ?? null });
}

export async function getNoteById(id: string) {
  if (isTauri()) {
    return await invokeTauri<DbNote | null>('get_note_by_id', { id });
  }
  return await postJson<DbNote | null>('/api/notes/get', { id });
}

export async function updateNote(
  id: string,
  payload: { title?: string; content?: string; tags?: string[] }
) {
  if (isTauri()) {
    await invokeTauri('update_note', { id, ...payload });
    return;
  }
  await postNoContent('/api/notes/update', { id, ...payload });
}

export async function deleteNote(id: string) {
  if (isTauri()) {
    await invokeTauri('delete_note', { id });
    return;
  }
  await postNoContent('/api/notes/delete', { id });
}

export async function toggleFavorite(id: string) {
  if (isTauri()) {
    await invokeTauri('toggle_favorite', { id });
    return;
  }
  await postNoContent('/api/notes/toggle-favorite', { id });
}
