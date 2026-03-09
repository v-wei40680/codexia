import { useEffect, useRef, useState } from 'react';
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
  // Relative path from cwd, shown as hint (e.g. "src/main.rs")
  relativePath: string;
}

interface CCFileMentionPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerElement: HTMLElement | null;
  query: string;
  onSelect: (filePath: string, fileName: string) => void;
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

// Recursively collect all files into a flat list
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

// Score a file against query — higher is better
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
  open,
  onOpenChange,
  triggerElement,
  query,
  onSelect,
}: CCFileMentionPopoverProps) {
  const { cwd } = useWorkspaceStore();
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load all files recursively when popover opens
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

  // Filter + rank files by query
  const visibleFiles = (() => {
    if (!query.trim()) {
      // No query: show all files sorted alphabetically by name
      return [...allFiles].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
    }
    return allFiles
      .map((f) => ({ file: f, score: scoreFile(f, query) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score || a.file.name.localeCompare(b.file.name))
      .map(({ file }) => file)
      .slice(0, 50);
  })();

  // Reset selection to 0 whenever list changes
  useEffect(() => { setSelectedIndex(0); }, [query, open]);

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
        if (f) { onSelect(f.path, f.name); onOpenChange(false); }
      } else if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIndex, visibleFiles, onSelect, onOpenChange]);

  // Scroll selected into view
  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const shouldUseSvgFileIcon = isTauri();

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <span
          ref={(el) => {
            if (el && triggerElement) {
              const rect = triggerElement.getBoundingClientRect();
              el.style.position = 'fixed';
              el.style.left = `${rect.left}px`;
              el.style.top = `${rect.top}px`;
              el.style.width = '0';
              el.style.height = '0';
              el.style.pointerEvents = 'none';
            }
          }}
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
                  onClick={() => { onSelect(file.path, file.name); onOpenChange(false); }}
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
