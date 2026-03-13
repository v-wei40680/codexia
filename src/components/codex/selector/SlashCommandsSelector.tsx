import { forwardRef, useImperativeHandle, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { codexService } from '@/services/codexService';

const SLASH_COMMANDS = [{ id: 'review', description: 'Review uncommitted changes' }];

// --- Input-triggered popover ---

interface SlashCommandPopoverProps {
  query: string;
  currentThreadId: string | null;
  onExecute: () => void;
  position: { top: number; left: number };
}

export interface SlashCommandPopoverHandle {
  moveSelection: (delta: number) => void;
  selectCurrent: () => void;
}

export const SlashCommandPopover = forwardRef<SlashCommandPopoverHandle, SlashCommandPopoverProps>(
  ({ query, currentThreadId, onExecute, position }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const filtered = SLASH_COMMANDS.filter((cmd) => cmd.id.startsWith(query.toLowerCase()));

    useEffect(() => {
      setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
      const target = itemRefs.current[selectedIndex];
      if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'nearest' }));
    }, [selectedIndex]);

    const executeCommand = useCallback(
      async (commandId: string) => {
        onExecute();
        if (commandId === 'review') {
          let targetThreadId = currentThreadId;
          if (!targetThreadId) {
            try {
              const thread = await codexService.threadStart();
              targetThreadId = thread.id;
            } catch (error) {
              console.error('Failed to start thread for review:', error);
              return;
            }
          }
          try {
            await codexService.startReview({
              threadId: targetThreadId,
              target: { type: 'uncommittedChanges' },
              delivery: null,
            });
          } catch (error) {
            console.error('Failed to start review:', error);
          }
        }
      },
      [currentThreadId, onExecute]
    );

    useImperativeHandle(
      ref,
      () => ({
        moveSelection: (delta) => {
          setSelectedIndex((prev) => Math.max(0, Math.min(filtered.length - 1, prev + delta)));
        },
        selectCurrent: () => {
          if (filtered[selectedIndex]) executeCommand(filtered[selectedIndex].id);
        },
      }),
      [filtered, selectedIndex, executeCommand]
    );

    if (typeof document === 'undefined' || filtered.length === 0) return null;

    return createPortal(
      <div
        style={
          {
            position: 'fixed',
            top: position.top,
            left: position.left,
            transform: 'translateY(calc(-100% - 8px))',
          } as CSSProperties
        }
        className="z-[9999] w-64 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>No commands found</CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.map((cmd, index) => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.id}
                    onClick={() => executeCommand(cmd.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <div className="font-medium text-sm">/{cmd.id}</div>
                    <div className="text-xs text-muted-foreground">{cmd.description}</div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          <span>↑↓ navigate</span>
          <span className="ml-3">↵ select</span>
          <span className="ml-3">Esc close</span>
        </div>
      </div>,
      document.body
    );
  }
);

SlashCommandPopover.displayName = 'SlashCommandPopover';
