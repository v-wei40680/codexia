import { invokeTauri, isTauri, postJson, postNoContent } from './shared';

export async function terminalStart(cwd?: string | null, cols?: number, rows?: number) {
  if (isTauri()) {
    return await invokeTauri<import('./shared').TerminalStartResponse>('terminal_start', {
      cwd,
      cols,
      rows,
    });
  }
  return await postJson<import('./shared').TerminalStartResponse>('/api/terminal/start', {
    cwd,
    cols,
    rows,
  });
}

export async function terminalWrite(sessionId: string, data: string) {
  if (isTauri()) {
    await invokeTauri<void>('terminal_write', { params: { session_id: sessionId, data } });
    return;
  }
  await postNoContent('/api/terminal/write', { session_id: sessionId, data });
}

export async function terminalResize(sessionId: string, cols: number, rows: number) {
  if (isTauri()) {
    await invokeTauri<void>('terminal_resize', {
      params: { session_id: sessionId, cols, rows },
    });
    return;
  }
  await postNoContent('/api/terminal/resize', { session_id: sessionId, cols, rows });
}

export async function terminalStop(sessionId: string) {
  if (isTauri()) {
    await invokeTauri<void>('terminal_stop', { params: { session_id: sessionId } });
    return;
  }
  await postNoContent('/api/terminal/stop', { session_id: sessionId });
}
