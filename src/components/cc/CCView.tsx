import { useCallback, useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCCStore, CCMessage as CCMessageType } from '@/stores/ccStore';
import { Card } from '@/components/ui/card';
import { CCMessage } from '@/components/cc/CCMessage';
import { ExamplePrompts } from '@/components/cc/ExamplePrompts';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { CCInput } from '@/components/cc/CCInput';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCCInputStore } from '@/stores/useCCInputStore';
import { ccInterrupt, ccSendMessage } from '@/services';
import { ProjectSelector } from '../project-selector';

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
  const { inputValue: input, setInputValue } = useCCInputStore();

  const { handleNewSession } = useCCSessionManager();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const setInput = useCallback(
    (value: string | ((prev: string) => string)) => {
      if (typeof value === 'function') {
        const nextValue = value(useCCInputStore.getState().inputValue);
        setInputValue(nextValue);
        return;
      }
      setInputValue(value);
    },
    [setInputValue]
  );

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

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeSessionId, addMessage, setLoading]);

  useEffect(() => {
    console.info('[CCView] Active session changed', { activeSessionId, cwd });
  }, [activeSessionId, cwd]);

  const handleSendMessage = async (messageText?: string) => {
    let textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    // Convert slash commands to natural language
    if (textToSend.startsWith('/')) {
      const parts = textToSend.slice(1).split(/\s+/, 1);
      const skillName = parts[0];
      const restOfMessage = textToSend.slice(skillName.length + 2).trim();

      // Transform slash command to natural language request
      textToSend = restOfMessage
        ? `Please use the ${skillName} skill to ${restOfMessage}`
        : `Please use the ${skillName} skill to help me.`;
    }

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

  const handleExamplePrompt = (prompt: string) => {
    // Append to input instead of replacing
    setInput((prev) => (prev ? prev + '\n\n' + prompt : prompt));
  };

  const handleScrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const handleScrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const [isPromptsExpanded, setIsPromptsExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none">
          <div className="flex flex-col gap-4 p-4">
            {messages.length === 0 && (
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
                    onSelectPrompt={handleExamplePrompt}
                    isExpanded={isPromptsExpanded}
                    onToggleExpanded={() => setIsPromptsExpanded(!isPromptsExpanded)}
                  />
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <CCMessage key={idx} message={msg} index={idx} />
            ))}
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
          <CCScrollControls onScrollUp={handleScrollUp} onScrollDown={handleScrollDown} />
        )}
      </div>

      <CCInput
        input={input}
        setInput={setInput}
        onSendMessage={handleSendMessage}
        onInterrupt={handleInterrupt}
      />
    </div>
  );
}
