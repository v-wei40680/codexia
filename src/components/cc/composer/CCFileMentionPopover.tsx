import { useEffect, useRef, useState, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { FileText } from 'lucide-react';
import { readDirectory, canonicalizePath } from '@/services/tauri/filesystem';
import { useWorkspaceStore } from '@/stores';
import { isTauri } from '@/hooks/runtime';
import type { TauriFileEntry } from '@/services/tauri/shared';

interface FileItem {
  name: string;
  path: string;
  relativePath: string;
}

interface CCFileMentionPopoverProps {
  input: string;
  setInput: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  triggerElement: HTMLElement | null;
}

const getExtension = (name: string) => {
  const idx = name.lastIndexOf('.');
  if (idx <= 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
};

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'target', 'dist', 'build', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv',
]);

async function collectFiles(
  dirPath: string,
  rootPath: string,
  depth: number,
  maxDepth: number,
  result: FileItem[]
): Promise<void> {
  if (depth > maxDepth) return;
  let entries: TauriFileEntry[];
  try {
    entries = await readDirectory(dirPath);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.is_directory) {
      await collectFiles(entry.path, rootPath, depth + 1, maxDepth, result);
    } else {
      const toPosix = (v: string) => v.replace(/\\/g, '/');
      const normalizedRoot = toPosix(rootPath).replace(/\/+$/, '');
      const normalizedPath = toPosix(entry.path);
      const relativePath = normalizedPath.startsWith(`${normalizedRoot}/`)
        ? normalizedPath.slice(normalizedRoot.length + 1)
        : normalizedPath;
      result.push({ name: entry.name, path: entry.path, relativePath });
    }
  }
}

function scoreFile(file: FileItem, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const name = file.name.toLowerCase();
  const rel = file.relativePath.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (rel.includes(q)) return 40;
  return -1;
}

export function CCFileMentionPopover({
  input,
  setInput,
  textareaRef,
  triggerElement,
}: CCFileMentionPopoverProps) {
  const { cwd } = useWorkspaceStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const triggerSpanRef = useRef<HTMLSpanElement | null>(null);

  // Detect `@query` pattern based on cursor position
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos === -1) {
      setOpen(false);
      setQuery('');
      return;
    }

    const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);

    if (textAfterAt.includes('\n')) {
      setOpen(false);
      setQuery('');
      return;
    }

    if (textAfterAt.includes(' ')) {
      setOpen(false);
      setQuery('');
      return;
    }

    setOpen(true);
    setQuery(textAfterAt);
  }, [input, textareaRef]);

  // Load all files when popover opens
  useEffect(() => {
    if (!open || !cwd) return;
    let isActive = true;
    const load = async () => {
      setLoading(true);
      try {
        const resolvedPath = await canonicalizePath(cwd);
        const result: FileItem[] = [];
        await collectFiles(resolvedPath, resolvedPath, 0, 8, result);
        if (isActive) setAllFiles(result);
      } catch (error) {
        console.error('Failed to load files:', error);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void load();
    return () => { isActive = false; };
  }, [open, cwd]);

  const visibleFiles = (() => {
    if (!query.trim()) {
      return [...allFiles].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
    }
    return allFiles
      .map((f) => ({ file: f, score: scoreFile(f, query) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name))
      .map(({ file }) => file)
      .slice(0, 50);
  })();

  useEffect(() => { setSelectedIndex(0); }, [query, open]);

  // Keep trigger span pinned to triggerElement's position (triggerElement may arrive after mount)
  useEffect(() => {
    const el = triggerSpanRef.current;
    if (!el || !triggerElement) return;
    const rect = triggerElement.getBoundingClientRect();
    el.style.position = 'fixed';
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
    el.style.width = '0';
    el.style.height = '0';
    el.style.pointerEvents = 'none';
  }, [triggerElement]);

  const handleSelect = useCallback(
    (filePath: string, fileName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setOpen(false);
        setQuery('');
        return;
      }

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = input.slice(0, cursorPos);
      const lastAtPos = textBeforeCursor.lastIndexOf('@');

      if (lastAtPos !== -1) {
        const { cwd: currentCwd } = useWorkspaceStore.getState();
        const toPosix = (v: string) => v.replace(/\\/g, '/');
        const normalizedCwd = toPosix(currentCwd).replace(/\/+$/, '');
        const normalizedPath = toPosix(filePath);
        const relativePath =
          normalizedCwd && normalizedPath.startsWith(`${normalizedCwd}/`)
            ? normalizedPath.slice(normalizedCwd.length + 1)
            : normalizedPath;
        const link = `[${fileName}](${relativePath})`;

        const before = input.slice(0, lastAtPos);
        const after = input.slice(cursorPos);
        setInput(`${before}${link} ${after}`);

        requestAnimationFrame(() => {
          const newPos = lastAtPos + link.length + 1;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          textarea.focus();
        });
      } else {
        textarea.focus();
      }

      setOpen(false);
      setQuery('');
    },
    [input, setInput, textareaRef]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visibleFiles.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setSelectedIndex((p) => (p + 1) % visibleFiles.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        setSelectedIndex((p) => (p - 1 + visibleFiles.length) % visibleFiles.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault(); e.stopPropagation();
        const f = visibleFiles[selectedIndex];
        if (f) handleSelect(f.path, f.name);
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIndex, visibleFiles, handleSelect]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const shouldUseSvgFileIcon = isTauri();

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <span
          ref={triggerSpanRef}
          aria-hidden="true"
        />
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="w-80 p-0 max-h-72 overflow-hidden flex flex-col shadow-xl z-50"
        side="top"
        align="start"
        sideOffset={4}
        avoidCollisions={true}
        onKeyDown={(e) => e.stopPropagation()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="overflow-y-auto flex-1 py-1">
          {loading ? (
            <div className="text-xs text-muted-foreground text-center py-4">Loading...</div>
          ) : visibleFiles.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">No files found</div>
          ) : (
            visibleFiles.map((file, index) => {
              const isSelected = index === selectedIndex;
              const extension = getExtension(file.name);
              const iconStyle =
                extension && extension in defaultStyles
                  ? defaultStyles[extension as keyof typeof defaultStyles]
                  : defaultStyles.txt;

              return (
                <Button
                  key={file.path}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  variant={isSelected ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-2 h-auto py-1.5 px-3 text-xs rounded-none"
                  onClick={() => handleSelect(file.path, file.name)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="shrink-0 w-4 h-4 flex items-center justify-center">
                    {shouldUseSvgFileIcon ? (
                      <FileIcon extension={extension} color={iconStyle.color} />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="ml-auto text-muted-foreground truncate max-w-[120px] text-right shrink-0">
                    {file.relativePath.includes('/')
                      ? file.relativePath.slice(0, file.relativePath.lastIndexOf('/'))
                      : ''}
                  </span>
                </Button>
              );
            })
          )}
        </div>
        <div className="border-t px-3 py-1.5 bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>Enter/Tab Select</span>
          <span>Esc Close</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
