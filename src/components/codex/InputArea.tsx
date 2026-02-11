import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, Square, X } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { FileSearchPopover } from './selector';
import type { FileSearchPopoverHandle } from './selector';
import type { FuzzyFileSearchResult } from '@/bindings';
import { useInputStore } from '@/stores/useInputStore';
import { getFilename } from '@/utils/getFilename';

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
  const isDev = import.meta.env.DEV;
  const debug = (...args: unknown[]) => {
    if (isDev) {
      console.log('[InputArea]', ...args);
    }
  };

  const { inputValue, setInputValue } = useInputStore();
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [fileSearchPosition, setFileSearchPosition] = useState({
    top: 0,
    left: 0,
  });
  const [atSymbolPosition, setAtSymbolPosition] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileSearchRef = useRef<FileSearchPopoverHandle>(null);

  // Focus textarea when thread changes or when triggered explicitly
  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentThreadId, inputFocusTrigger]);

  useEffect(() => {
    debug('file search visibility changed', {
      showFileSearch,
      fileSearchQuery,
      fileSearchPosition,
      inputLength: inputValue.length,
    });
  }, [showFileSearch, fileSearchPosition, fileSearchQuery, inputValue.length]);

  // Handle input changes and detect @ symbol
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    // First update the input value
    setInputValue(newValue);

    // Then detect @ symbol
    // Find the last @ symbol before cursor
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's a space after the @ (if so, close the popover)
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpace = textAfterAt.includes(' ') || textAfterAt.includes('\n');

      if (!hasSpace) {
        // Extract query after @
        const query = textAfterAt;

        // Calculate popover position
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setFileSearchPosition({
            top: rect.top,
            left: rect.left,
          });
        }

        // Update state to show popover
        debug('open file search', {
          query,
          atSymbolPosition: lastAtIndex,
          fileSearchPosition,
          cursorPosition,
        });
        setFileSearchQuery(query);
        setAtSymbolPosition(lastAtIndex);
        setShowFileSearch(true);
      } else {
        debug('close file search due to space/newline');
        setShowFileSearch(false);
      }
    } else {
      debug('close file search due to no @');
      setShowFileSearch(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (file: FuzzyFileSearchResult) => {
    if (atSymbolPosition === -1) return;

    const currentValue = inputValue;
    // Replace from @ to cursor position with the file path
    const beforeAt = currentValue.substring(0, atSymbolPosition);
    const afterCursor = currentValue.substring(
      textareaRef.current?.selectionStart || currentValue.length
    );
    const fileReference = `[${getFilename(file.path)}](${file.path}) `;
    const newValue = `${beforeAt}${fileReference}${afterCursor}`;

    setInputValue(newValue);
    debug('file selected', {
      selectedPath: file.path,
      newValueLength: newValue.length,
    });
    setShowFileSearch(false);
    setAtSymbolPosition(-1);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeAt.length + fileReference.length;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && images.length === 0) || isProcessing) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      await onSend(message);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle Enter when file search is open (let the popover handle it)
    if (
      showFileSearch &&
      (e.key === 'Enter' ||
        e.key === 'Tab' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'Escape')
    ) {
      e.preventDefault();

      if (e.key === 'ArrowUp') {
        fileSearchRef.current?.moveSelection(-1);
        return;
      }
      if (e.key === 'ArrowDown') {
        fileSearchRef.current?.moveSelection(1);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        fileSearchRef.current?.selectCurrent();
        return;
      }
      if (e.key === 'Escape') {
        debug('close file search via escape');
        setShowFileSearch(false);
      }
      return;
    }

    if (e.key === 'Enter') {
      // If IME is active, do NOT send
      if (isComposing || (e.nativeEvent as any).isComposing) {
        return;
      }
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-background">
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
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => {
            // Keep composing state briefly to avoid macOS IME Enter misfire
            setIsComposing(true);
            setTimeout(() => {
              setIsComposing(false);
            }, 50);
          }}
          placeholder="Ask anything..."
          className="min-h-[60px] max-h-[200px] w-full resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-4 text-base"
          disabled={isProcessing}
        />
        <div className="flex justify-between items-center p-0 pl-3 bg-muted/20 rounded-b-xl">
          <div className="flex items-center">{children}</div>
          <div>
            {isProcessing ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-lg"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                size="icon"
                className="h-8 w-8 rounded-lg"
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
