import { useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, Square, X } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { SlashCommandPopover, SkillsInputPopover } from './selector';
import { FileMentionPopover } from '@/components/common';
import { useInputStore } from '@/stores/useInputStore';
import { useCodexStore } from '@/stores/codex';
import { useIsProcessing } from '@/hooks/codex';
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
  onSend: (message: string) => Promise<void>;
  onStop: () => Promise<void>;
  images?: string[];
  onRemoveImage?: (index: number) => void;
}

export function InputArea({
  onSend,
  onStop,
  children,
  images = [],
  onRemoveImage,
}: InputAreaProps & { children?: React.ReactNode }) {
  const { currentThreadId, inputFocusTrigger } = useCodexStore();
  const isProcessing = useIsProcessing();
  const isMobile = useIsMobile();

  const { inputValue, setInputValue } = useInputStore();

  const isComposing = useRef(false);
  const editorRef = useRef<MDXEditorMethods>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const handleSendRef = useRef<() => Promise<void>>(async () => { });

  // Focus the editor when thread changes or triggered externally
  useEffect(() => {
    editorRef.current?.focus();
  }, [currentThreadId, inputFocusTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach IME listeners to the underlying contenteditable after mount
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;

    const editable = wrapper.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!editable) return;

    const onCompositionStart = () => { isComposing.current = true; };
    const onCompositionEnd = () => {
      // Brief delay to match macOS IME Enter misfire pattern
      setTimeout(() => { isComposing.current = false; }, 50);
    };

    editable.addEventListener('compositionstart', onCompositionStart);
    editable.addEventListener('compositionend', onCompositionEnd);

    return () => {
      editable.removeEventListener('compositionstart', onCompositionStart);
      editable.removeEventListener('compositionend', onCompositionEnd);
    };
  }, []);

  const handleWrapperKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Enter without Shift = send (unless IME is active)
      if (e.key === 'Enter' && !e.shiftKey) {
        if (isComposing.current || (e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) {
          return;
        }
        e.preventDefault();
        handleSendRef.current();
      }
    },
    [],
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
  handleSendRef.current = handleSend;

  const handleStop = async () => {
    try {
      await onStop();
    } catch (error) {
      console.error('Failed to stop turn:', error);
    }
  };

  return (
    <div className={`${isMobile && 'pb-[env(safe-area-inset-bottom)]'} bg-background`}>
      <FileMentionPopover
        input={inputValue}
        setInput={setInputValue}
        editorRef={editorRef}
        triggerElement={editorWrapperRef.current}
      />

      <SlashCommandPopover
        input={inputValue}
        setInputValue={setInputValue}
        editorRef={editorRef}
        triggerElement={editorWrapperRef.current}
        currentThreadId={currentThreadId}
      />

      <SkillsInputPopover
        input={inputValue}
        setInputValue={setInputValue}
        editorRef={editorRef}
        triggerElement={editorWrapperRef.current}
      />

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
          className="mdx-input-wrapper max-h-64 overflow-y-auto px-2 pt-2"
        >
          <MDXEditor
            ref={editorRef}
            markdown={inputValue}
            onChange={setInputValue}
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
        <div className="flex items-center justify-between rounded-b-xl bg-muted/20">
          <div className="flex items-center">{children}</div>
          <div>
            {isProcessing ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="icon"
                className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'} rounded-full`}
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() && images.length === 0}
                size="icon"
                className={`${isMobile ? 'h-10 w-10' : 'h-8 w-8'} rounded-full`}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
