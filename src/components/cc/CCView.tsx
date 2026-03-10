import { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Card } from '@/components/ui/card';

import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCCInputStore } from '@/stores/useCCInputStore';

import { CCMessage as CCMessageType } from './types/messages';
import { CCMessage } from '@/components/cc/messages';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { CCInput } from '@/components/cc/composer';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { ccInterrupt, ccSendMessage } from '@/services';
import { ProjectSelector } from '../project-selector';
import { ExamplePrompts } from '@/components/cc/ExamplePrompts';

const CC_LISTENER_READY_EVENT = 'cc-session-listener-ready';
const CC_PERMISSION_LISTENER_READY_EVENT = 'cc-permission-listener-ready';

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

  // Reset transient UI state when directory changes, but keep selected session.
  useEffect(() => {
    if (!cwd) return;
    if (activeSessionId) return;

    clearMessages();
    setConnected(false);
    setLoading(false);
  }, [cwd, activeSessionId, clearMessages, setConnected, setLoading]);

  // Listen to message events
  useEffect(() => {
    if (!activeSessionId) return;

    const eventName = `cc-message:${activeSessionId}`;
    console.info('[CCView] Bind message listener', { activeSessionId, eventName });
    const unlisten = listen<CCMessageType>(eventName, (event) => {
      const message = event.payload;
      addMessage(message);

      // Set loading to false when we receive a Result message
      if (message.type === 'result') {
        setLoading(false);
      }
    });
    void unlisten.then(() => {
      console.info('[CCView] Message listener ready', { activeSessionId, eventName });
      window.dispatchEvent(
        new CustomEvent(CC_LISTENER_READY_EVENT, { detail: { sessionId: activeSessionId } })
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeSessionId, addMessage, setLoading]);

  // Listen for permission requests
  useEffect(() => {
    if (!activeSessionId) return;

    console.info('[CCView] Bind permission listener', { activeSessionId });
    const unlisten = listen<{
      requestId: string;
      sessionId: string;
      toolName: string;
      toolInput: any;
    }>('cc-permission-request', (event) => {
      const { requestId, sessionId, toolName, toolInput } = event.payload;
      console.info('[CCView] Received permission request', { requestId, sessionId });

      if (sessionId === activeSessionId) {
        addMessage({
          type: 'permission_request',
          requestId,
          sessionId,
          toolName,
          toolInput,
        });
      } else {
        console.warn('[CCView] Ignore permission request for inactive session', {
          activeSessionId,
          requestId,
          sessionId,
        });
      }
    });
    void unlisten.then(() => {
      console.info('[CCView] Permission listener ready', { activeSessionId });
      window.dispatchEvent(
        new CustomEvent(CC_PERMISSION_LISTENER_READY_EVENT, {
          detail: { sessionId: activeSessionId },
        })
      );
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeSessionId, addMessage]);

  useEffect(() => {
    console.info('[CCView] Active session changed', { activeSessionId, cwd });
  }, [activeSessionId, cwd]);

  const handleSendMessage = async (messageText?: string) => {
    let textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    // Create new session if no active session
    if (!activeSessionId) {
      await handleNewSession(textToSend);
      return;
    }

    // Add user message to store
    addMessage({
      type: 'user',
      text: textToSend,
    });

    setInput('');
    setLoading(true);

    try {
      // Backend will connect automatically on first message if not connected
      await ccSendMessage(activeSessionId, textToSend);

      // Mark as connected after successfully sending message
      if (!isConnected) {
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setLoading(false);
      addMessage({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: `Error: ${error}`,
            },
          ],
        },
      });
    }
  };

  const handleInterrupt = async () => {
    if (!activeSessionId) return;

    try {
      await ccInterrupt(activeSessionId);
    } catch (error) {
      console.error('Failed to interrupt:', error);
    } finally {
      setLoading(false);
    }
  };

  const [isPromptsExpanded, setIsPromptsExpanded] = useState(false);
  const shouldShowWelcome = messages.length === 0 && !activeSessionId;

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
          <div className="flex flex-col gap-2 p-4">
            {shouldShowWelcome && (
              <div className={`flex-1 flex flex-col items-center max-w-2xl mx-auto py-8 text-center animate-in fade-in duration-500 ${isPromptsExpanded ? 'justify-start mt-4' : 'justify-center'}`}>
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
                    onToggleExpanded={() => setIsPromptsExpanded(!isPromptsExpanded)}
                  />
                </div>
              </div>
            )}
            {messages.map((msg, idx) => {
              // Skip user messages that are pure tool_result errors — rendered inline in preceding assistant message
              if (
                msg.type === 'user' &&
                !(msg as any).text &&
                typeof (msg as any).message?.content !== 'string'
              ) {
                const blocks = (msg as any).content ?? (msg as any).message?.content ?? [];
                const hasOnlyErrors = Array.isArray(blocks) && blocks.length > 0 && blocks.every((b: any) => b.type === 'tool_result' && b.is_error);
                if (hasOnlyErrors) return null;
              }

              // Collect errors from next user message to pass as inlineErrors to assistant
              const nextMsg = messages[idx + 1];
              const inlineErrors: Record<string, any> = {};
              if (msg.type === 'assistant' && nextMsg?.type === 'user') {
                const nextBlocks = (nextMsg as any).content ?? (nextMsg as any).message?.content ?? [];
                if (Array.isArray(nextBlocks)) {
                  for (const b of nextBlocks) {
                    if (b.type === 'tool_result' && b.is_error && b.tool_use_id) {
                      inlineErrors[b.tool_use_id] = b;
                    }
                  }
                }
              }

              return <CCMessage key={idx} message={msg} index={idx} inlineErrors={Object.keys(inlineErrors).length ? inlineErrors : undefined} />;
            })}
            {isLoading && (
              <Card className="p-3 bg-gray-50 dark:bg-gray-900">
                <div className="text-xs text-muted-foreground animate-pulse">
                  Thinking
                </div>
              </Card>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <CCScrollControls scrollContainerRef={scrollContainerRef} />
        )}
      </div>

      <CCInput
        onSendMessage={handleSendMessage}
        onInterrupt={handleInterrupt}
      />
    </div>
  );
}
