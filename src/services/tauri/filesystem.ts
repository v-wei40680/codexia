import {
  getJson,
  invokeTauri,
  isDesktopTauri,
  postJson,
  postJsonWithOptions,
  postNoContent,
  postNoContentWithOptions,
} from './shared';

export async function readFile(filePath: string, options?: { suppressToast?: boolean }) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('read_file', { filePath });
  }
  return await postJsonWithOptions<string>(
    '/api/filesystem/read-file',
    { filePath },
    options
  );
}

export async function readTextFileLines(filePath: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<string[]>('read_text_file_lines', { filePath });
  }
  return await postJson<string[]>('/api/filesystem/read-text-file-lines', { filePath });
}

export async function getCodexHome() {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('codex_home');
  }
  return await getJson<string>('/api/filesystem/codex-home');
}

export async function writeFile(filePath: string, content: string) {
  if (isDesktopTauri()) {
    await invokeTauri('write_file', { filePath, content });
    return;
  }
  await postNoContent('/api/filesystem/write-file', { filePath, content });
}

export async function readPdfContent(filePath: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('read_pdf_content', { filePath });
  }
  return await postJson<string>('/api/filesystem/read-pdf', { filePath });
}

export async function readXlsxContent(filePath: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('read_xlsx_content', { filePath });
  }
  return await postJson<string>('/api/filesystem/read-xlsx', { filePath });
}

export async function readDirectory(path: string, options?: { suppressToast?: boolean }) {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<import('./shared').TauriFileEntry>>('read_directory', { path });
  }
  return await postJsonWithOptions<Array<import('./shared').TauriFileEntry>>(
    '/api/filesystem/read-directory',
    { path },
    options
  );
}

export async function getHomeDirectory() {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('get_home_directory');
  }
  return await getJson<string>('/api/filesystem/home-directory');
}

export async function searchFiles(params: {
  root: string;
  query: string;
  excludeFolders: string[];
  maxResults?: number;
}) {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<import('./shared').TauriFileEntry>>('search_files', params);
  }
  return await postJson<Array<import('./shared').TauriFileEntry>>('/api/filesystem/search-files', {
    root: params.root,
    query: params.query,
    exclude_folders: params.excludeFolders,
    max_results: params.maxResults,
  });
}

export async function searchFilesByName(params: {
  root: string;
  query: string;
  excludeFolders: string[];
  maxResults?: number;
}) {
  if (isDesktopTauri()) {
    return await invokeTauri<Array<import('./shared').TauriFileEntry>>('search_files_by_name', params);
  }
  return await postJson<Array<import('./shared').TauriFileEntry>>('/api/filesystem/search-files-by-name', {
    root: params.root,
    query: params.query,
    exclude_folders: params.excludeFolders,
    max_results: params.maxResults,
  });
}

export async function canonicalizePath(path: string) {
  if (isDesktopTauri()) {
    return await invokeTauri<string>('canonicalize_path', { path });
  }
  return await postJson<string>('/api/filesystem/canonicalize-path', { path });
}

export async function deleteFile(filePath: string) {
  if (isDesktopTauri()) {
    await invokeTauri('delete_file', { filePath });
    return;
  }
  await postNoContent('/api/filesystem/delete-file', { filePath });
}

export async function startWatchDirectory(folderPath: string) {
  if (isDesktopTauri()) {
    await invokeTauri('start_watch_directory', { folderPath });
    return;
  }
  await postNoContent('/api/filesystem/start-watch', { path: folderPath });
}

export async function stopWatchDirectory(folderPath: string) {
  if (isDesktopTauri()) {
    await invokeTauri('stop_watch_directory', { folderPath });
    return;
  }
  await postNoContent('/api/filesystem/stop-watch', { path: folderPath });
}

export async function startWatchFile(filePath: string) {
  if (isDesktopTauri()) {
    await invokeTauri('start_watch_file', { filePath });
    return;
  }
  await postNoContentWithOptions('/api/filesystem/start-watch-file', { filePath }, { suppressToast: true });
}

export async function stopWatchFile(filePath: string) {
  if (isDesktopTauri()) {
    await invokeTauri('stop_watch_file', { filePath });
    return;
  }
  await postNoContentWithOptions('/api/filesystem/stop-watch-file', { filePath }, { suppressToast: true });
}
