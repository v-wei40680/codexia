import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { SendIcon, Square, X } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { FileSearchPopover } from './selector';
import type { FileSearchPopoverHandle } from './selector';
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
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileSearchPosition, setFileSearchPosition] = useState({ top: 0, left: 0 });
  const [atSymbolPosition, setAtSymbolPosition] = useState(-1);

  // IME composition tracking — attached to the editor's contenteditable
  const isComposing = useRef(false);

  const editorRef = useRef<MDXEditorMethods>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const fileSearchRef = useRef<FileSearchPopoverHandle>(null);

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

  // Intercept Enter key on the editor wrapper to handle send / file search navigation
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

      // Enter without Shift = send (unless IME is active)
      if (e.key === 'Enter' && !e.shiftKey) {
        if (isComposing.current || (e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [showFileSearch, isComposing]
  );

  // Detect @ mentions in the markdown string returned by MDXEditor onChange
  const handleEditorChange = useCallback(
    (markdown: string) => {
      setInputValue(markdown);

      // Use the raw markdown to find @ position (simple last-@ heuristic)
      const lastAtIndex = markdown.lastIndexOf('@');
      if (lastAtIndex !== -1) {
        const textAfterAt = markdown.substring(lastAtIndex + 1);
        const hasBreak = textAfterAt.includes(' ') || textAfterAt.includes('\n');

        if (!hasBreak) {
          const wrapper = editorWrapperRef.current;
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            setFileSearchPosition({ top: rect.top, left: rect.left });
          }
          setFileSearchQuery(textAfterAt);
          setAtSymbolPosition(lastAtIndex);
          setShowFileSearch(true);
          debug('@ file search open', { query: textAfterAt });
          return;
        }
      }

      setShowFileSearch(false);
    },
    [setInputValue]
  );

  // Replace `@query` with a markdown file link using Lexical's own update mechanism.
  // This avoids setMarkdown (which resets cursor) and DOM hacks (which confuse Lexical).
  const handleFileSelect = useCallback(
    (file: FuzzyFileSearchResult) => {
      if (atSymbolPosition === -1) return;

      const fileRef = `[${getFilename(file.path)}](${file.path})\u00A0`;

      // Build the new markdown string
      const current = inputValue;
      const before = current.substring(0, atSymbolPosition);
      const after = current.substring(atSymbolPosition + 1 + fileSearchQuery.length);
      const next = `${before}${fileRef}${after}`;

      // Update markdown state and editor content
      setInputValue(next);
      editorRef.current?.setMarkdown(next);

      // After setMarkdown flushes, place cursor inside the last text node
      setTimeout(() => {
        const editable = editorWrapperRef.current?.querySelector(
          '[contenteditable="true"]'
        ) as HTMLElement | null;
        if (!editable) return;
        editable.focus();

        // Find the deepest last text node so cursor lands inside inline content
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

      <div className="max-w-6xl mx-auto relative border rounded-xl bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring transition-all">
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
          className={`mdx-input-wrapper ${isMobile ? 'min-h-[72px] max-h-[180px]' : 'min-h-[60px] max-h-[200px]'} overflow-y-auto`}
        >
          <MDXEditor
            ref={editorRef}
            markdown={inputValue}
            onChange={handleEditorChange}
            placeholder="Ask anything... @file"
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
