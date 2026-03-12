import { useState, useEffect, useRef, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ccGetInstalledSkills } from '@/services';

interface CCSkillsPopoverProps {
  input: string;
  setInput: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  triggerElement: HTMLElement | null;
}

export function CCSkillsPopover({
  input,
  setInput,
  textareaRef,
  triggerElement,
}: CCSkillsPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    ccGetInstalledSkills()
      .then(setInstalledSkills)
      .catch((err) => console.error('Failed to load skills:', err));
  }, []);

  // Detect `$query` pattern based on cursor position
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = input.slice(0, cursorPos);
    const lastDollarPos = textBeforeCursor.lastIndexOf('$');

    if (lastDollarPos === -1) {
      setOpen(false);
      setQuery('');
      return;
    }

    // `$` must be at start or preceded by whitespace/newline
    const charBefore = lastDollarPos > 0 ? textBeforeCursor[lastDollarPos - 1] : '';
    if (charBefore && charBefore !== ' ' && charBefore !== '\n') {
      setOpen(false);
      setQuery('');
      return;
    }

    const textAfterDollar = textBeforeCursor.slice(lastDollarPos + 1);

    // No spaces or newlines after `$` — still typing the skill name
    if (textAfterDollar.includes(' ') || textAfterDollar.includes('\n')) {
      setOpen(false);
      setQuery('');
      return;
    }

    setOpen(true);
    setQuery(textAfterDollar);
  }, [input, textareaRef]);

  const filteredSkills = installedSkills.filter(
    (s) => !query || s.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, open]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (skillName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = input.slice(0, cursorPos);
      const lastDollarPos = textBeforeCursor.lastIndexOf('$');

      if (lastDollarPos !== -1) {
        const before = input.slice(0, lastDollarPos);
        const after = input.slice(cursorPos);
        // Skills are invoked with `/skillname` by Claude Code CLI
        setInput(`${before}/${skillName} ${after}`);

        requestAnimationFrame(() => {
          const newPos = lastDollarPos + skillName.length + 2; // `/` + name + space
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
      if (filteredSkills.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((p) => (p + 1) % filteredSkills.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((p) => (p - 1 + filteredSkills.length) % filteredSkills.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const skill = filteredSkills[selectedIndex];
        if (skill) handleSelect(skill);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedIndex, filteredSkills, handleSelect]);

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
          {filteredSkills.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-2">
              {installedSkills.length === 0 ? 'No skills installed' : 'No matches'}
            </div>
          ) : (
            filteredSkills.map((skill, index) => (
              <Button
                key={skill}
                ref={(el) => { itemRefs.current[index] = el; }}
                variant={index === selectedIndex ? 'secondary' : 'ghost'}
                className="w-full justify-start text-xs h-7 font-mono rounded-none"
                onClick={() => handleSelect(skill)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                /{skill}
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
