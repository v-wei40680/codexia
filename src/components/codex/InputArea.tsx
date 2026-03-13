import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SendIcon, Square, X } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { FileSearchPopover, SlashCommandPopover, SkillsInputPopover } from './selector';
import type { FileSearchPopoverHandle, SlashCommandPopoverHandle } from './selector';
import type { FuzzyFileSearchResult } from '@/bindings';
import { useInputStore } from '@/stores/useInputStore';
import { getFilename } from '@/utils/getFilename';
import { useIsMobile } from '@/hooks/use-mobile';

// MDXEditor imports
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  type MDXEditorMethods,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import '@/mdx-input.css';

interface InputAreaProps {
  currentThreadId: string | null;
  currentTurnId: string | null;
  isProcessing: boolean;
  onSend: (message: string) => Promise<void>;
  onStop: () => Promise<void>;
  inputFocusTrigger?: number;
  images?: string[];
  onRemoveImage?: (index: number) => void;
}

export function InputArea({
  currentThreadId,
  currentTurnId,
  isProcessing,
  onSend,
  onStop,
  inputFocusTrigger,
  children,
  images = [],
  onRemoveImage,
}: InputAreaProps & { children?: React.ReactNode }) {
  const isMobile = useIsMobile();
  const isDev = import.meta.env.DEV;
  const debug = (...args: unknown[]) => {
    if (isDev) console.log('[InputArea]', ...args);
  };

  const { inputValue, setInputValue } = useInputStore();

  // @ file search state
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileSearchPosition, setFileSearchPosition] = useState({ top: 0, left: 0 });
  const [atSymbolPosition, setAtSymbolPosition] = useState(-1);

  // / slash commands state
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandQuery, setSlashCommandQuery] = useState('');
  const [slashCommandPosition, setSlashCommandPosition] = useState({ top: 0, left: 0 });
  const [slashSymbolPosition, setSlashSymbolPosition] = useState(-1);

  // $ skills state
  const [showSkills, setShowSkills] = useState(false);
  const [skillsPosition, setSkillsPosition] = useState({ top: 0, left: 0 });
  const [dollarSymbolPosition, setDollarSymbolPosition] = useState(-1);
  const [skillsQuery, setSkillsQuery] = useState('');

  // IME composition tracking — attached to the editor's contenteditable
  const isComposing = useRef(false);

  const editorRef = useRef<MDXEditorMethods>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const fileSearchRef = useRef<FileSearchPopoverHandle>(null);
  const slashCommandRef = useRef<SlashCommandPopoverHandle>(null);

  // Focus the editor when thread changes or triggered externally
  useEffect(() => {
    editorRef.current?.focus();
  }, [currentThreadId, inputFocusTrigger]);

  // Attach IME listeners to the underlying contenteditable after mount
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const editable = wrapper.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!editable) return;

    const onCompositionStart = () => {
      isComposing.current = true;
    };
    const onCompositionEnd = () => {
      // Brief delay to match macOS IME Enter misfire pattern
      setTimeout(() => {
        isComposing.current = false;
      }, 50);
    };

    editable.addEventListener('compositionstart', onCompositionStart);
    editable.addEventListener('compositionend', onCompositionEnd);

    return () => {
      editable.removeEventListener('compositionstart', onCompositionStart);
      editable.removeEventListener('compositionend', onCompositionEnd);
    };
  }, []);

  // Intercept Enter key on the editor wrapper to handle send / popover navigation
  const handleWrapperKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // File search navigation takes priority
      if (showFileSearch) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          fileSearchRef.current?.moveSelection(-1);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          fileSearchRef.current?.moveSelection(1);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          fileSearchRef.current?.selectCurrent();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowFileSearch(false);
          return;
        }
      }

      // Slash commands navigation
      if (showSlashCommands) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          slashCommandRef.current?.moveSelection(-1);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          slashCommandRef.current?.moveSelection(1);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          slashCommandRef.current?.selectCurrent();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSlashCommands(false);
          return;
        }
      }

      // Skills close on Escape
      if (showSkills && e.key === 'Escape') {
        e.preventDefault();
        handleSkillsClose();
        return;
      }

      // Enter without Shift = send (unless IME is active)
      if (e.key === 'Enter' && !e.shiftKey) {
        if (isComposing.current || (e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [showFileSearch, showSlashCommands, showSkills, isComposing]
  );

  const getWrapperRect = () => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return { top: 0, left: 0 };
    const rect = wrapper.getBoundingClientRect();
    return { top: rect.top, left: rect.left };
  };

  // Detect @ / $ mentions in the markdown string returned by MDXEditor onChange
  const handleEditorChange = useCallback(
    (markdown: string) => {
      setInputValue(markdown);

      // --- @ file search ---
      const lastAtIndex = markdown.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const textAfterAt = markdown.substring(lastAtIndex + 1);
        const hasBreak = textAfterAt.includes(' ') || textAfterAt.includes('\n');
        if (!hasBreak) {
          setFileSearchPosition(getWrapperRect());
          setFileSearchQuery(textAfterAt);
          setAtSymbolPosition(lastAtIndex);
          setShowFileSearch(true);
          setShowSlashCommands(false);
          setShowSkills(false);
          debug('@ file search open', { query: textAfterAt });
          return;
        }
      }
      setShowFileSearch(false);

      // --- / slash commands ---
      const lastSlashIndex = markdown.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const charBefore = lastSlashIndex > 0 ? markdown[lastSlashIndex - 1] : ' ';
        const isAtWordStart = charBefore === ' ' || charBefore === '\n';
        if (lastSlashIndex === 0 || isAtWordStart) {
          const textAfterSlash = markdown.substring(lastSlashIndex + 1);
          const hasBreak = textAfterSlash.includes(' ') || textAfterSlash.includes('\n');
          if (!hasBreak) {
            setSlashCommandPosition(getWrapperRect());
            setSlashCommandQuery(textAfterSlash);
            setSlashSymbolPosition(lastSlashIndex);
            setShowSlashCommands(true);
            setShowSkills(false);
            debug('/ slash commands open', { query: textAfterSlash });
            return;
          }
        }
      }
      setShowSlashCommands(false);

      // --- $ skills ---
      const lastDollarIndex = markdown.lastIndexOf('$');
      if (lastDollarIndex !== -1) {
        const charBefore = lastDollarIndex > 0 ? markdown[lastDollarIndex - 1] : ' ';
        const isAtWordStart = charBefore === ' ' || charBefore === '\n';
        if (lastDollarIndex === 0 || isAtWordStart) {
          const textAfterDollar = markdown.substring(lastDollarIndex + 1);
          const hasBreak = textAfterDollar.includes(' ') || textAfterDollar.includes('\n');
          if (!hasBreak) {
            setSkillsPosition(getWrapperRect());
            setDollarSymbolPosition(lastDollarIndex);
            setSkillsQuery(textAfterDollar);
            setShowSkills(true);
            debug('$ skills open');
            return;
          }
        }
      }
      setShowSkills(false);
    },
    [setInputValue]
  );

  // Replace `@query` with a markdown file link
  const handleFileSelect = useCallback(
    (file: FuzzyFileSearchResult) => {
      if (atSymbolPosition === -1) return;

      const fileRef = `[${getFilename(file.path)}](${file.path})\u00A0`;

      const current = inputValue;
      const before = current.substring(0, atSymbolPosition);
      const after = current.substring(atSymbolPosition + 1 + fileSearchQuery.length);
      const next = `${before}${fileRef}${after}`;

      setInputValue(next);
      editorRef.current?.setMarkdown(next);

      setTimeout(() => {
        const editable = editorWrapperRef.current?.querySelector(
          '[contenteditable="true"]'
        ) as HTMLElement | null;
        if (!editable) return;
        editable.focus();

        const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
        let lastTextNode: Text | null = null;
        while (walker.nextNode()) {
          lastTextNode = walker.currentNode as Text;
        }

        const domSel = window.getSelection();
        if (domSel && lastTextNode) {
          const range = document.createRange();
          range.setStart(lastTextNode, lastTextNode.length);
          range.collapse(true);
          domSel.removeAllRanges();
          domSel.addRange(range);
        }
      }, 0);

      setShowFileSearch(false);
      setAtSymbolPosition(-1);
      debug('file selected', { path: file.path });
    },
    [atSymbolPosition, fileSearchQuery, inputValue, setInputValue]
  );

  // Remove `/command` text from input after slash command executes
  const handleSlashCommandExecute = useCallback(() => {
    const current = inputValue;
    const before = current.substring(0, slashSymbolPosition);
    const after = current.substring(slashSymbolPosition + 1 + slashCommandQuery.length);
    const next = (before + after).replace(/^\n+/, '');
    setInputValue(next);
    editorRef.current?.setMarkdown(next);
    setShowSlashCommands(false);
    setSlashSymbolPosition(-1);
  }, [inputValue, slashSymbolPosition, slashCommandQuery]);

  // Remove `$query` text from input when skills popover closes
  const handleSkillsClose = useCallback(() => {
    const current = inputValue;
    const before = current.substring(0, dollarSymbolPosition);
    const after = current.substring(dollarSymbolPosition + 1 + skillsQuery.length);
    const next = (before + after).replace(/^\n+/, '');
    setInputValue(next);
    editorRef.current?.setMarkdown(next);
    setShowSkills(false);
    setDollarSymbolPosition(-1);
  }, [inputValue, dollarSymbolPosition, skillsQuery]);

  const handleSend = async () => {
    const markdown = inputValue.trim().replace(/\u00A0/g, ' ');
    if (!markdown && images.length === 0) return;
    if (isProcessing) return;

    setInputValue('');
    editorRef.current?.setMarkdown('');

    try {
      await onSend(markdown);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleStop = async () => {
    if (!currentThreadId || !currentTurnId) return;
    try {
      await onStop();
    } catch (error) {
      console.error('Failed to stop turn:', error);
    }
  };

  return (
    <div
      className={`${isMobile ? 'px-2 pb-[env(safe-area-inset-bottom)]' : 'px-4'} bg-background`}
    >
      {showFileSearch && (
        <FileSearchPopover
          ref={fileSearchRef}
          query={fileSearchQuery}
          onSelect={handleFileSelect}
          onClose={() => setShowFileSearch(false)}
          position={fileSearchPosition}
        />
      )}

      {showSlashCommands && (
        <SlashCommandPopover
          ref={slashCommandRef}
          query={slashCommandQuery}
          currentThreadId={currentThreadId}
          onExecute={handleSlashCommandExecute}
          position={slashCommandPosition}
        />
      )}

      {showSkills && (
        <SkillsInputPopover
          position={skillsPosition}
          onClose={handleSkillsClose}
        />
      )}

      <div className="max-w-3xl mx-auto relative border rounded-xl bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring transition-all">
        {/* Image attachments */}
        {images.length > 0 && (
          <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
            {images.map((path, index) => (
              <div key={index} className="relative group shrink-0">
                <img
                  src={convertFileSrc(path)}
                  alt="attachment"
                  className="h-16 w-16 object-cover rounded-md border"
                />
                <button
                  onClick={() => onRemoveImage?.(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* MDXEditor WYSIWYG input */}
        <div
          ref={editorWrapperRef}
          onKeyDown={handleWrapperKeyDown}
          className={`mdx-input-wrapper ${isMobile ? 'min-h-[40px] max-h-[180px]' : 'min-h-[32px] max-h-[200px]'} overflow-y-auto p-2`}
        >
          <MDXEditor
            ref={editorRef}
            markdown={inputValue}
            onChange={handleEditorChange}
            placeholder="Ask anything... @file /command $skills"
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              linkPlugin(),
              markdownShortcutPlugin(),
            ]}
            contentEditableClassName="mdx-input-editable"
          />
        </div>

        {/* Toolbar row */}
        <div
          className={`flex items-center justify-between rounded-b-xl bg-muted/20 ${isMobile ? 'gap-2 px-2 py-1.5' : 'p-0 pl-3'}`}
        >
          <div className={`flex items-center ${isMobile ? 'flex-wrap gap-1' : ''}`}>
            {children}
          </div>
          <div>
            {isProcessing ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="icon"
                className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'} rounded-lg`}
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() && images.length === 0}
                size="icon"
                className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'} rounded-lg`}
              >
                <SendIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
