import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ChevronDown, RotateCcw, Square } from 'lucide-react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { terminalResize, terminalStart, terminalStop, terminalWrite } from '@/services/tauri';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

type BottomTerminalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type TerminalDataPayload = {
  session_id: string;
  data: string;
};

type TerminalExitPayload = {
  session_id: string;
  message: string;
};

export function BottomTerminal({ open, onOpenChange }: BottomTerminalProps) {
  const { cwd } = useWorkspaceStore();
  const [shell, setShell] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) {
      return;
    }

    const term = new Terminal({
      convertEol: false,
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, Consolas, monospace',
      fontSize: 12,
      scrollback: 5000,
      theme: {
        background: '#0a0a0a',
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.writeln('Terminal ready.');

    const disposeData = term.onData((data) => {
      const currentSession = sessionIdRef.current;
      if (!currentSession) {
        return;
      }
      void terminalWrite(currentSession, data).catch((error) => {
        term.writeln(`\r\n[write failed] ${String(error)}`);
      });
    });

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    return () => {
      disposeData.dispose();
      term.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, []);

  const startSession = async () => {
    const term = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    if (!term || !fitAddon || sessionIdRef.current || isStartingRef.current) {
      return;
    }
    isStartingRef.current = true;

    try {
      fitAddon.fit();
      const { session_id, shell: shellName } = await terminalStart(
        cwd,
        Math.max(term.cols, 2),
        Math.max(term.rows, 2)
      );
      setSessionId(session_id);
      setShell(shellName);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopSession = async () => {
    const current = sessionIdRef.current;
    if (!current) {
      return;
    }
    await terminalStop(current);
    setSessionId(null);
    sessionIdRef.current = null;
  };

  const restartSession = async () => {
    await stopSession();
    await startSession();
  };

  useEffect(() => {
    if (open) {
      void startSession();
      requestAnimationFrame(() => {
        terminalRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    let unlistenData: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    void listen<TerminalDataPayload>('terminal:data', (event) => {
      if (event.payload.session_id !== sessionIdRef.current) {
        return;
      }
      terminalRef.current?.write(event.payload.data);
    }).then((fn) => {
      unlistenData = fn;
    });

    void listen<TerminalExitPayload>('terminal:exit', (event) => {
      if (event.payload.session_id !== sessionIdRef.current) {
        return;
      }
      terminalRef.current?.writeln(`\r\n[${event.payload.message}]`);
      setSessionId(null);
      sessionIdRef.current = null;
    }).then((fn) => {
      unlistenExit = fn;
    });

    return () => {
      if (unlistenData) {
        unlistenData();
      }
      if (unlistenExit) {
        unlistenExit();
      }
    };
  }, []);

  useEffect(() => {
    const fitAndResize = () => {
      const term = terminalRef.current;
      const fitAddon = fitAddonRef.current;
      const current = sessionIdRef.current;
      if (!term || !fitAddon) {
        return;
      }
      fitAddon.fit();
      if (current) {
        void terminalResize(current, Math.max(term.cols, 2), Math.max(term.rows, 2));
      }
    };

    const observer = new ResizeObserver(fitAndResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', fitAndResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fitAndResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      const current = sessionIdRef.current;
      if (current) {
        void terminalStop(current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'border-t border-border/80 bg-black text-zinc-100 transition-[height,opacity] duration-200 ease-out',
        open ? 'h-72 opacity-100' : 'h-0 opacity-0'
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
          <div className="text-xs font-mono text-zinc-300">
            {shell || 'terminal'} {sessionId ? '(running)' : '(stopped)'}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => void restartSession()}
              title="Restart shell"
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => void stopSession()}
              title="Stop shell"
            >
              <Square className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => onOpenChange(false)}
              title="Hide terminal"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="min-h-0 flex-1 px-2 py-2"
          onMouseDown={() => {
            terminalRef.current?.focus();
          }}
        />
      </div>
    </div>
  );
}
