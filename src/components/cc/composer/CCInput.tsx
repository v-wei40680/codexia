import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { Slash, CircleStop, Send, Plus } from 'lucide-react';
import { useCCStore } from '@/stores/ccStore';
import { useInputStore } from '@/stores/useInputStore';
import { useCCInputStore, useWorkspaceStore } from '@/stores';
import { ccGetInstalledSkills } from '@/services';
import { CCPermissionModeSelect, CCFileMentionPopover } from '@/components/cc/composer';
import { SelectFilesMenuItem } from '@/components/codex/selector/AttachmentSelector';
import { ModelSelector } from './ModelSelector';

const CC_INPUT_FOCUS_EVENT = 'cc-input-focus-request';

interface CCInputProps {
  onSendMessage: (text?: string) => void;
  onInterrupt: () => void;
}

export function CCInput({ onSendMessage, onInterrupt }: CCInputProps) {
  const { isLoading } = useCCStore();
  const { inputValue: input, setInputValue: setInput } = useCCInputStore();
  const { appendFileLinks } = useInputStore();
  const [showCommands, setShowCommands] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showFileMention, setShowFileMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hiddenTriggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const skills = await ccGetInstalledSkills();
        setInstalledSkills(skills);
      } catch (error) {
        console.error('Failed to load installed skills:', error);
      }
    };
    loadSkills();
  }, []);

  useEffect(() => {
    const handleFocusRequest = () => {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    };

    window.addEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
    return () => {
      window.removeEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
    };
  }, []);

  const handleInsertCommand = (skillName: string) => {
    setInput(`/${skillName} `);
    setShowCommands(false);
  };

  const handleSelectFiles = (paths: string[]) => {
    try {
      appendFileLinks(paths);
      setShowAttachmentMenu(false);
    } catch (error) {
      console.error('Failed to select files:', error);
    }
  };

  // Handle @ mention detection based on cursor position
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const checkMentionPosition = () => {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = input.slice(0, cursorPos);

      // Find the last @ before cursor
      const lastAtPos = textBeforeCursor.lastIndexOf('@');

      if (lastAtPos === -1) {
        setShowFileMention(false);
        setMentionQuery('');
        return;
      }

      // Check if there's a newline between @ and cursor
      const textAfterAt = textBeforeCursor.slice(lastAtPos + 1);
      if (textAfterAt.includes('\n')) {
        setShowFileMention(false);
        setMentionQuery('');
        return;
      }

      // Check if there's a space after @
      const spacePos = textAfterAt.indexOf(' ');
      if (spacePos !== -1) {
        // There's a space after @, don't show popover
        setShowFileMention(false);
        setMentionQuery('');
        return;
      }

      // Valid mention position
      setShowFileMention(true);
      setMentionQuery(textAfterAt);
    };

    checkMentionPosition();
  }, [input]);

  const handleFileMentionSelect = useCallback(
    (filePath: string, fileName: string) => {
      const textarea = textareaRef.current;
      if (!textarea) {
        setShowFileMention(false);
        setMentionQuery('');
        return;
      }

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = input.slice(0, cursorPos);
      const lastAtPos = textBeforeCursor.lastIndexOf('@');

      if (lastAtPos !== -1) {
        // Replace "@query" with a relative file link anchored to cwd
        const { cwd } = useWorkspaceStore.getState();
        const toPosix = (v: string) => v.replace(/\\/g, '/');
        const normalizedCwd = toPosix(cwd).replace(/\/+$/, '');
        const normalizedPath = toPosix(filePath);
        const relativePath =
          normalizedCwd && normalizedPath.startsWith(`${normalizedCwd}/`)
            ? normalizedPath.slice(normalizedCwd.length + 1)
            : normalizedPath;
        const link = `[${fileName}](${relativePath})`;

        const before = input.slice(0, lastAtPos);
        const after = input.slice(cursorPos);
        setInput(`${before}${link} ${after}`);

        // Move cursor to after the inserted link
        requestAnimationFrame(() => {
          const newPos = lastAtPos + link.length + 1;
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
          textarea.focus();
        });
      } else {
        textarea.focus();
      }

      setShowFileMention(false);
      setMentionQuery('');
    },
    [input, setInput]
  );

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSendMessage();
      }
    } else if (e.key === 'Escape' && showFileMention) {
      setShowFileMention(false);
    }
  };

  return (
    <>
      <div className="shrink-0 p-2 border-t bg-background">
        <div className="relative group">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Ask Claude to do anything..."
            className="min-h-16 w-full pb-11 pr-2 resize-none"
          />

          {/* Hidden anchor for @ mention popover positioning */}
          <span
            ref={hiddenTriggerRef}
            className="absolute bottom-11 left-2 pointer-events-none opacity-0"
            aria-hidden="true"
          />

          <div className="absolute left-1 bottom-1 flex items-center gap-0.5">
            <Popover open={showAttachmentMenu} onOpenChange={setShowAttachmentMenu}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Add Files"
                >
                  <Plus className={`h-4 w-4 ${showAttachmentMenu ? 'text-primary' : ''}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-44 p-1">
                <SelectFilesMenuItem onFilesSelected={handleSelectFiles} onAfterSelect={() => setShowAttachmentMenu(false)} className="h-8 w-full text-xs" />
              </PopoverContent>
            </Popover>

            <Popover open={showCommands} onOpenChange={setShowCommands}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Insert Slash Command"
                >
                  <Slash className={`h-4 w-4 ${showCommands ? 'text-primary' : ''}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-56 p-2">
                <div className="space-y-1">
                  {installedSkills.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No skills installed
                    </div>
                  ) : (
                    installedSkills.map((skill) => (
                      <Button
                        key={skill}
                        variant="ghost"
                        className="w-full justify-start text-xs h-7 font-mono"
                        onClick={() => handleInsertCommand(skill)}
                      >
                        /{skill}
                      </Button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <CCPermissionModeSelect />
          </div>

          <div className="absolute right-1 bottom-1 flex items-center gap-1.5 px-1 bg-background/50 backdrop-blur-sm rounded-md">
            <ModelSelector />
            <Button
              onClick={isLoading ? onInterrupt : () => onSendMessage()}
              size="icon"
              className="h-7 w-7"
              variant={isLoading ? 'destructive' : 'default'}
              disabled={!input.trim() && !isLoading}
            >
              {isLoading ? (
                <CircleStop className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <CCFileMentionPopover
        open={showFileMention}
        onOpenChange={setShowFileMention}
        triggerElement={hiddenTriggerRef.current}
        query={mentionQuery}
        onSelect={handleFileMentionSelect}
      />
    </>
  );
}
