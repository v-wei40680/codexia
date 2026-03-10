import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Card } from '@/components/ui/card';

import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCCInputStore } from '@/stores/useCCInputStore';

import type { CCMessage as CCMessageType } from './types/messages';
import { CCMessage } from '@/components/cc/messages';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { CCInput } from '@/components/cc/composer';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { ccInterrupt, ccSendMessage } from '@/services';
import { ProjectSelector } from '../project-selector';
import { ExamplePrompts } from '@/components/cc/ExamplePrompts';

const CC_LISTENER_READY_EVENT = 'cc-session-listener-ready';
const CC_PERMISSION_LISTENER_READY_EVENT = 'cc-permission-listener-ready';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect tool_result errors from a user message that immediately follows an
 * assistant message, so they can be rendered inline in the assistant's tool badges.
 */
function collectInlineErrors(
  messages: CCMessageType[],
  idx: number,
): Record<string, any> | undefined {
  const msg = messages[idx];
  if (msg.type !== 'assistant') return undefined;

  const next = messages[idx + 1];
  if (!next || next.type !== 'user') return undefined;

  const blocks: any[] =
    (next as any).content ??
    (Array.isArray((next as any).message?.content) ? (next as any).message.content : []) ??
    [];

  const errors: Record<string, any> = {};
  for (const b of blocks) {
    if (b.type === 'tool_result' && b.is_error && b.tool_use_id) {
      errors[b.tool_use_id] = b;
    }
  }
  return Object.keys(errors).length > 0 ? errors : undefined;
}

/**
 * Returns true if the user message should be hidden from the message list.
 * Pure tool_result error messages are rendered inline in the preceding assistant message.
 */
function shouldSkipUserMessage(msg: CCMessageType): boolean {
  if (msg.type !== 'user') return false;
  if ((msg as any).text) return false;
  if (typeof (msg as any).message?.content === 'string') return false;

  const blocks: any[] =
    (msg as any).content ??
    (Array.isArray((msg as any).message?.content) ? (msg as any).message.content : []) ??
    [];

  return (
    blocks.length > 0 &&
    blocks.every((b: any) => b.type === 'tool_result' && b.is_error)
  );
}

// ---------------------------------------------------------------------------
// CCView
// ---------------------------------------------------------------------------

export default function CCView() {
  const {
    activeSessionId,
    messages,
    isConnected,
    isLoading,
    addMessage,
    setLoading,
    setConnected,
    clearMessages,
  } = useCCStore();
  const { cwd } = useWorkspaceStore();
  const { inputValue: input, setInputValue: setInput } = useCCInputStore();
  const { handleNewSession } = useCCSessionManager();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPromptsExpanded, setIsPromptsExpanded] = useState(false);

  const shouldShowWelcome = messages.length === 0 && !activeSessionId;

  // Reset transient UI state when directory changes, but keep selected session.
  useEffect(() => {
    if (!cwd || activeSessionId) return;
    clearMessages();
    setConnected(false);
    setLoading(false);
  }, [cwd, activeSessionId, clearMessages, setConnected, setLoading]);

  // Bind Tauri message stream listener for the active session.
  useEffect(() => {
    if (!activeSessionId) return;
    const eventName = `cc-message:${activeSessionId}`;
    console.info('[CCView] Bind message listener', { activeSessionId, eventName });

    const unlistenPromise = listen<CCMessageType>(eventName, (event) => {
      const message = event.payload;
      addMessage(message);
      if (message.type === 'result') setLoading(false);
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Message listener ready', { activeSessionId });
      window.dispatchEvent(
        new CustomEvent(CC_LISTENER_READY_EVENT, { detail: { sessionId: activeSessionId } }),
      );
    });

    return () => { void unlistenPromise.then((fn) => fn()); };
  }, [activeSessionId, addMessage, setLoading]);

  // Bind Tauri permission request listener for the active session.
  useEffect(() => {
    if (!activeSessionId) return;
    console.info('[CCView] Bind permission listener', { activeSessionId });

    const unlistenPromise = listen<{
      requestId: string;
      sessionId: string;
      toolName: string;
      toolInput: any;
    }>('cc-permission-request', (event) => {
      const { requestId, sessionId, toolName, toolInput } = event.payload;
      if (sessionId !== activeSessionId) {
        console.warn('[CCView] Ignoring permission request for inactive session', {
          activeSessionId,
          requestId,
          sessionId,
        });
        return;
      }
      addMessage({ type: 'permission_request', requestId, sessionId, toolName, toolInput });
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Permission listener ready', { activeSessionId });
      window.dispatchEvent(
        new CustomEvent(CC_PERMISSION_LISTENER_READY_EVENT, {
          detail: { sessionId: activeSessionId },
        }),
      );
    });

    return () => { void unlistenPromise.then((fn) => fn()); };
  }, [activeSessionId, addMessage]);


  const handleSendMessage = useCallback(async (messageText?: string) => {
    const text = (messageText ?? input).trim();
    if (!text || isLoading) return;

    if (!activeSessionId) {
      await handleNewSession(text);
      return;
    }

    addMessage({ type: 'user', text });
    setInput('');
    setLoading(true);

    try {
      await ccSendMessage(activeSessionId, text);
      if (!isConnected) setConnected(true);
    } catch (error) {
      console.error('[CCView] Failed to send message:', error);
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
      console.error('[CCView] Failed to interrupt:', error);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId, setLoading]);

  // Pre-compute inline errors map to avoid recalculating inside the render loop.
  const inlineErrorsMap = useMemo(
    () =>
      messages.reduce<Record<number, Record<string, any>>>((acc, _, idx) => {
        const errors = collectInlineErrors(messages, idx);
        if (errors) acc[idx] = errors;
        return acc;
      }, {}),
    [messages],
  );


  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none"
        >
          <div className="flex flex-col gap-2 p-4">

            {/* Welcome / empty state */}
            {shouldShowWelcome && (
              <div
                className={`flex-1 flex flex-col items-center max-w-2xl mx-auto py-8 text-center animate-in fade-in duration-500 ${
                  isPromptsExpanded ? 'justify-start mt-4' : 'justify-center'
                }`}
              >
                {!isPromptsExpanded && (
                  <>
                    <div className="mb-4 space-y-3 animate-in fade-in zoom-in-95 duration-500">
                      <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
                        let&apos;s build
                      </h1>
                    </div>
                    <div className="flex justify-center mb-12 animate-in fade-in zoom-in-95 duration-500">
                      <ProjectSelector
                        variant="hero"
                        className="h-11 max-w-64 gap-2 px-4 bg-background hover:bg-accent shadow-sm border-none transition-all rounded-xl font-medium"
                        triggerMode="project-name"
                        showChevron
                      />
                    </div>
                  </>
                )}
                <div className="w-full">
                  <ExamplePrompts
                    onSelectPrompt={setInput}
                    isExpanded={isPromptsExpanded}
                    onToggleExpanded={() => setIsPromptsExpanded((v) => !v)}
                  />
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg, idx) => {
              if (shouldSkipUserMessage(msg)) return null;
              return (
                <CCMessage
                  key={idx}
                  message={msg}
                  index={idx}
                  inlineErrors={inlineErrorsMap[idx]}
                />
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <Card className="p-3 bg-gray-50 dark:bg-gray-900">
                <div className="text-xs text-muted-foreground animate-pulse">Thinking</div>
              </Card>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <CCScrollControls scrollContainerRef={scrollContainerRef} />
        )}
      </div>

      <CCInput onSendMessage={handleSendMessage} onInterrupt={handleInterrupt} />
    </div>
  );
}
