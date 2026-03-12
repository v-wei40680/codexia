import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CircleStop, Send } from 'lucide-react';
import { useCCStore } from '@/stores/ccStore';
import { useCCInputStore } from '@/stores';
import { CCPermissionModeSelect, CCFileMentionPopover } from '@/components/cc/composer';
import { ModelSelector } from './ModelSelector';
import { CCAttachmentButton } from './CCAttachmentButton';
import { CCSlashCommandPopover } from './CCSlashCommandPopover';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { ccInterrupt, ccSendMessage } from '@/services';

const CC_INPUT_FOCUS_EVENT = 'cc-input-focus-request';

export function CCInput() {
  const {
    activeSessionId,
    isConnected,
    isLoading,
    addMessage,
    setLoading,
    setConnected,
  } = useCCStore();
  const { inputValue: input, setInputValue: setInput } = useCCInputStore();
  const { handleNewSession } = useCCSessionManager();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hiddenTriggerRef = useRef<HTMLSpanElement>(null);
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const handleFocusRequest = () => {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    };
    window.addEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
    return () => window.removeEventListener(CC_INPUT_FOCUS_EVENT, handleFocusRequest);
  }, []);

  // Capture the span element after mount so popovers can use it for positioning
  useEffect(() => {
    setTriggerEl(hiddenTriggerRef.current);
  }, []);

  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || isLoading) return;

    setInput('');

    if (!activeSessionId) {
      await handleNewSession(text);
      return;
    }

    addMessage({ type: 'user', text });
    setLoading(true);

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
  }, [input, isLoading, activeSessionId, isConnected, addMessage, setInput, setLoading, setConnected, handleNewSession]);

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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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

          {/* Hidden anchor for popover positioning */}
          <span
            ref={hiddenTriggerRef}
            className="absolute bottom-11 left-2 pointer-events-none opacity-0"
            aria-hidden="true"
          />

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
      </div>

      <CCSlashCommandPopover
        input={input}
        setInput={setInput}
        textareaRef={textareaRef}
        triggerElement={triggerEl}
      />

      <CCFileMentionPopover
        input={input}
        setInput={setInput}
        textareaRef={textareaRef}
        triggerElement={triggerEl}
      />
    </>
  );
}
