import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { codexService } from '@/services/codexService';
import type { FuzzyFileSearchResult } from '@/bindings';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface FileSearchPopoverProps {
  query: string;
  onSelect: (file: FuzzyFileSearchResult) => void;
  onClose?: () => void;
  position?: {
    top: number;
    left: number;
  };
}

export interface FileSearchPopoverHandle {
  moveSelection: (delta: number) => void;
  selectCurrent: () => void;
}

export const FileSearchPopover = forwardRef<FileSearchPopoverHandle, FileSearchPopoverProps>(
  ({ query, onSelect, position }, ref) => {
    const isDev = import.meta.env.DEV;
    const debug = (...args: unknown[]) => {
      if (isDev) {
        console.log('[FileSearchPopover]', ...args);
      }
    };

    const [files, setFiles] = useState<FuzzyFileSearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const { cwd } = useWorkspaceStore();

    // Search for files when query changes
    useEffect(() => {
      debug('mounted', { query, position });
      return () => {
        debug('unmounted');
      };
    }, []);

    useEffect(() => {
      const searchFiles = async () => {
        if (!query.trim() || !cwd) {
          debug('skip search', { query, cwd });
          setFiles([]);
          setSelectedIndex(0);
          return;
        }

        setIsLoading(true);
        try {
          debug('search start', { query, cwd });
          const results = await codexService.fuzzyFileSearch({
            roots: [cwd],
            query: query.trim(),
            cancellationToken: null,
          });
          debug('search success', { query, resultCount: results.length });
          setFiles(results);
          setSelectedIndex(0);
        } catch (error) {
          console.error('[FileSearchPopover] Failed to search files:', error);
          setFiles([]);
        } finally {
          setIsLoading(false);
        }
      };

      const debounceTimer = setTimeout(searchFiles, 150);
      return () => clearTimeout(debounceTimer);
    }, [query, cwd]);

    useEffect(() => {
      debug('position updated', position);
    }, [position]);

    useEffect(() => {
      if (files.length === 0) return;
      if (selectedIndex >= files.length) {
        setSelectedIndex(0);
      }
    }, [files, selectedIndex]);

    useEffect(() => {
      const target = itemRefs.current[selectedIndex];
      if (!target) return;
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'nearest' });
      });
    }, [selectedIndex, files]);

    useImperativeHandle(
      ref,
      () => ({
        moveSelection: (delta) => {
          setSelectedIndex((prev) => {
            if (files.length === 0) return 0;
            const next = Math.min(Math.max(prev + delta, 0), files.length - 1);
            return next;
          });
        },
        selectCurrent: () => {
          const current = files[selectedIndex];
          if (current) {
            onSelect(current);
          }
        },
      }),
      [files, selectedIndex, onSelect]
    );

    if (typeof document === 'undefined') {
      return null;
    }

    return createPortal(
      <div
        style={
          {
            position: 'fixed',
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            transform: 'translateY(calc(-100% - 8px))',
          } as CSSProperties
        }
        className="z-[9999] w-96 overflow-hidden rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-hidden"
      >
        <Command
          shouldFilter={false}
          value={files[selectedIndex]?.path ?? ''}
          onValueChange={(value) => {
            const nextIndex = files.findIndex((file) => file.path === value);
            if (nextIndex !== -1) {
              setSelectedIndex(nextIndex);
            }
          }}
        >
          <CommandList className="max-h-80">
            {!query.trim() ? (
              <div className="p-4 text-sm text-muted-foreground">
                File search mode. Start typing to find a file.
              </div>
            ) : isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Searching files...</div>
            ) : files.length === 0 ? (
              <CommandEmpty>No files found</CommandEmpty>
            ) : (
              <CommandGroup>
                {files.map((file, index) => (
                  <CommandItem
                    key={`${file.path}-${index}`}
                    value={file.path}
                    onClick={() => onSelect(file)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="font-medium truncate">{file.file_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{file.path}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <span>↑↓ to navigate</span>
          <span className="ml-3">↵ or Tab to select</span>
          <span className="ml-3">Esc to close</span>
        </div>
      </div>,
      document.body
    );
  }
);

FileSearchPopover.displayName = 'FileSearchPopover';
