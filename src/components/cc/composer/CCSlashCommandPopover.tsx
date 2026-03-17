import { useState, useEffect, useRef, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useCCStore } from '@/stores/cc';
import { ccGetSlashCommands } from '@/services';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

interface CCSlashCommandPopoverProps {
  input: string;
  setInput: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  triggerElement: HTMLElement | null;
}

export function CCSlashCommandPopover({
  input,
  setInput,
  textareaRef,
  triggerElement,
}: CCSlashCommandPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slashCommands = useCCStore((s) => s.slashCommands);
  const setSlashCommands = useCCStore((s) => s.setSlashCommands);
  const cwd = useWorkspaceStore((s) => s.cwd);

  // Seed slash commands from disk on mount if the store is empty.
  // System::init will overwrite with the authoritative list when a session starts.
  useEffect(() => {
    if (slashCommands.length > 0) return;
    ccGetSlashCommands(cwd || undefined)
      .then(setSlashCommands)
      .catch((err) => console.error('[CCSlashCommandPopover] Failed to load slash commands:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect `/query` pattern based on cursor position
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const lastSlashPos = textBeforeCursor.lastIndexOf('/');

    if (lastSlashPos === -1) {
      setOpen(false);
      setQuery('');
      return;
    }

    // `/` must be at start or preceded by whitespace/newline
    const charBefore = lastSlashPos > 0 ? textBeforeCursor[lastSlashPos - 1] : '';
    if (charBefore && charBefore !== ' ' && charBefore !== '\n') {
      setOpen(false);
      setQuery('');
      return;
    }

    const textAfterSlash = textBeforeCursor.slice(lastSlashPos + 1);

    // No spaces or newlines after `/` — still typing the command name
    if (textAfterSlash.includes(' ') || textAfterSlash.includes('\n')) {
      setOpen(false);
      setQuery('');
      return;
    }

    setOpen(true);
    setQuery(textAfterSlash);
  }, [input, textareaRef]);

  const filteredCommands = slashCommands.filter(
    (cmd) => !query || cmd.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (commandName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = input.slice(0, cursorPos);
      const lastSlashPos = textBeforeCursor.lastIndexOf('/');

      if (lastSlashPos !== -1) {
        const before = input.slice(0, lastSlashPos);
        const after = input.slice(cursorPos);
        setInput(`${before}/${commandName} ${after}`);

        requestAnimationFrame(() => {
          const newPos = lastSlashPos + commandName.length + 2; // `/` + name + space
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          textarea.focus();
        });
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
      if (filteredCommands.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((p) => (p + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((p) => (p - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) handleSelect(cmd);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIndex, filteredCommands, handleSelect]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
        align="start"
        side="top"
        className="w-56 p-1 max-h-60 overflow-hidden flex flex-col shadow-xl z-50"
        sideOffset={4}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto flex-1 py-1">
          {filteredCommands.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              No matches
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <Button
                key={cmd}
                ref={(el) => { itemRefs.current[index] = el; }}
                variant={index === selectedIndex ? 'secondary' : 'ghost'}
                className="w-full justify-start text-xs h-7 font-mono rounded-none"
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                /{cmd}
              </Button>
            ))
          )}
        </div>
        <div className="border-t px-3 py-1.5 bg-muted/30 flex items-center gap-3 text-xs text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>Enter Select</span>
          <span>Esc Close</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
