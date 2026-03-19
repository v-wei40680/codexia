import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CircleStop, Send } from 'lucide-react';
import { useCCStore } from '@/stores/cc';
import { useCCInputStore, useAgentCenterStore } from '@/stores';
import { CCPermissionModeSelect } from '@/components/cc/composer';
import { ModelSelector } from './ModelSelector';
import { CCAttachmentButton } from './CCAttachmentButton';
import { CCSlashCommandPopover } from './CCSlashCommandPopover';
import { CCSkillsPopover } from './CCSkillsPopover';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { ccInterrupt, ccSendMessage } from '@/services';
import { WorkspaceSwitcher, FileMentionPopover } from '@/components/common';

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

const CC_INPUT_FOCUS_EVENT = 'cc-input-focus-request';

interface ComposerProps {
  /** When provided, overrides the normal send — called instead of creating a session. */
  overrideSend?: (text: string) => void;
  onAfterSend?: (sessionId: string, text: string) => void;
}

export function Composer({ overrideSend, onAfterSend }: ComposerProps = {}) {
  const {
    activeSessionId,
    isConnected,
    isLoading,
    addMessage,
    setLoading,
    setConnected,
  } = useCCStore();
  const { inputValue: input, setInputValue: setInput } = useCCInputStore();
  const { setCurrentAgentCardId } = useAgentCenterStore();
  const { handleNewSession } = useCCSessionManager();

  const editorRef = useRef<MDXEditorMethods | null>(null);
  const editorWrapperRef = useRef<HTMLDivElement | null>(null);
  const isComposing = useRef(false);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);

  // Capture wrapper element after mount for popover positioning
  useEffect(() => {
    setTriggerEl(editorWrapperRef.current);
  }, []);

  useEffect(() => {
    const handleFocusRequest = () => {
      requestAnimationFrame(() => {
        editorRef.current?.focus();
      });
    };
    window.addEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
    return () => window.removeEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
  }, []);

  // Attach IME composition listeners to the underlying contenteditable
  useEffect(() => {
    const wrapper = editorWrapperRef.current;
    if (!wrapper) return;
    const editable = wrapper.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!editable) return;

    const onCompositionStart = () => { isComposing.current = true; };
    const onCompositionEnd = () => {
      setTimeout(() => { isComposing.current = false; }, 50);
    };

    editable.addEventListener('compositionstart', onCompositionStart);
    editable.addEventListener('compositionend', onCompositionEnd);
    return () => {
      editable.removeEventListener('compositionstart', onCompositionStart);
      editable.removeEventListener('compositionend', onCompositionEnd);
    };
  }, []);

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim().replace(/\u00A0/g, ' ');
    if (!text || isLoading) return;

    if (overrideSend) {
      setInput('');
      editorRef.current?.setMarkdown('');
      overrideSend(text);
      return;
    }

    setInput('');
    editorRef.current?.setMarkdown('');

    if (!activeSessionId) {
      await handleNewSession(text);
      const newSessionId = useCCStore.getState().activeSessionId;
      if (newSessionId) onAfterSend?.(newSessionId, text);
      return;
    }

    setCurrentAgentCardId(activeSessionId);
    addMessage({ type: 'user', text });
    setLoading(true);
    onAfterSend?.(activeSessionId, text);

    try {
      await ccSendMessage(activeSessionId, text);
      if (!isConnected) setConnected(true);
    } catch (error) {
      console.error('[CCInput] Failed to send message:', error);
      setLoading(false);
      addMessage({
        type: 'assistant',
        message: { content: [{ type: 'text', text: `Error: ${error}` }] },
      });
    }
  }, [input, isLoading, activeSessionId, isConnected, addMessage, setInput, setLoading, setConnected, handleNewSession, setCurrentAgentCardId]);

  const handleInterrupt = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await ccInterrupt(activeSessionId);
    } catch (error) {
      console.error('[CCInput] Failed to interrupt:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, setLoading]);

  const handleSend = useCallback(() => {
    if (!isLoading && input.trim()) {
      handleSendMessage();
    }
  }, [isLoading, input, handleSendMessage]);

  const handleWrapperKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (isComposing.current || (e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleEditorChange = useCallback(
    (markdown: string) => {
      setInput(markdown);
    },
    [setInput]
  );

  return (
    <>
      <div className="shrink-0">
        <div className="relative group">
          {/* MDXEditor wrapper */}
          <div
            ref={editorWrapperRef}
            onKeyDown={handleWrapperKeyDown}
            className="mdx-input-wrapper min-h-16 max-h-48 overflow-y-auto border border-input rounded-md px-2 pt-2 pb-11 bg-transparent focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring transition-[color,box-shadow]"
          >
            <MDXEditor
              ref={editorRef}
              markdown={input}
              onChange={handleEditorChange}
              placeholder="Ask Claude to do anything..."
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

          <div className="absolute left-1 bottom-1 flex items-center gap-0.5">
            <CCAttachmentButton />
            <CCPermissionModeSelect />
          </div>

          <div className="absolute right-1 bottom-1 flex items-center gap-1.5 px-1 bg-background/50 backdrop-blur-sm rounded-md">
            <ModelSelector />
            <Button
              onClick={isLoading ? handleInterrupt : handleSend}
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
        <WorkspaceSwitcher />
      </div>

      <CCSlashCommandPopover
        input={input}
        setInput={setInput}
        editorRef={editorRef}
        triggerElement={triggerEl}
      />

      <CCSkillsPopover
        input={input}
        setInput={setInput}
        editorRef={editorRef}
        triggerElement={triggerEl}
      />

      <FileMentionPopover
        input={input}
        setInput={setInput}
        editorRef={editorRef}
        triggerElement={triggerEl}
      />
    </>
  );
}
