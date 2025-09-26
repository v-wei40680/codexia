import { create } from 'zustand';

interface TokenCountShape {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
  total_tokens: number;
}

interface EphemeralStoreState {
  // sessionId -> filePath -> { unified, updatedAt }
  sessionFileDiffs: Record<string, Record<string, { unified: string; updatedAt: number }>>;
  // sessionId -> latest token usage
  sessionTokenUsage: Record<string, TokenCountShape | undefined>;
  setTurnDiff: (sessionId: string, unifiedDiff: string) => void;
  clearTurnDiffs: (sessionId: string) => void;
  setSessionTokenUsage: (sessionId: string, usage?: TokenCountShape) => void;
}

export const useEphemeralStore = create<EphemeralStoreState>((set) => ({
  sessionFileDiffs: {},
  sessionTokenUsage: {},
  setTurnDiff: (sessionId, unifiedDiff) =>
    set((state) => {
      // Parse unified diff into per-file segments and merge (overwrite by file)
      const lines = (unifiedDiff || '').split('\n');
      const current: Record<string, string> = {};
      let pendingOld: string | null = null;
      let currentFile: string | null = null;
      let buf: string[] = [];

      const push = () => {
        if (currentFile && buf.length > 0) {
          current[currentFile] = buf.join('\n');
        }
        currentFile = null;
        buf = [];
        pendingOld = null;
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('diff --git')) { push(); continue; }
        if (line.startsWith('--- ')) { push(); pendingOld = line; continue; }
        if (line.startsWith('+++ ')) {
          push();
          const newPath = line.replace(/^\+\+\+\s+/, '').trim();
          currentFile = newPath;
          buf = [];
          if (pendingOld) buf.push(pendingOld);
          buf.push(line);
          pendingOld = null;
          continue;
        }
        if (currentFile) buf.push(line);
      }
      push();

      const prev = state.sessionFileDiffs[sessionId] || {};
      const merged: Record<string, { unified: string; updatedAt: number }> = { ...prev };
      const now = Date.now();
      for (const [file, seg] of Object.entries(current)) {
        merged[file] = { unified: seg, updatedAt: now };
      }

      return {
        sessionFileDiffs: {
          ...state.sessionFileDiffs,
          [sessionId]: merged,
        },
      };
    }),
  clearTurnDiffs: (sessionId) =>
    set((state) => {
      const next = { ...state.sessionFileDiffs };
      delete next[sessionId];
      return { sessionFileDiffs: next };
    }),
  setSessionTokenUsage: (sessionId, usage) =>
    set((state) => ({
      sessionTokenUsage: { ...state.sessionTokenUsage, [sessionId]: usage },
    })),
}));
