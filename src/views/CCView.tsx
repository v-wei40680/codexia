import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCCStore, CCMessage as CCMessageType } from '@/stores/ccStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil } from 'lucide-react';
import { CCMessage } from '@/components/cc/CCMessage';
import { ExamplePrompts } from '@/components/cc/ExamplePrompts';
import { useCCSessionManager } from '@/hooks/useCCSessionManager';
import { CCInput } from '@/components/cc/CCInput';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

export default function CCView() {
  const {
    activeSessionId,
    messages,
    options,
    isConnected,
    isLoading,
    showExamples,
    isViewingHistory,
    addMessage,
    setLoading,
    setShowExamples,
    setConnected,
    setViewingHistory,
    clearMessages,
    setActiveSessionId,
  } = useCCStore();
  const { cwd } = useWorkspaceStore();

  const { handleNewSession } = useCCSessionManager();
  const [input, setInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Clear messages and reset session when directory changes
  useEffect(() => {
    if (cwd) {
      clearMessages();
      setActiveSessionId(null);
      setConnected(false);
      setLoading(false);
      setShowExamples(true);
    }
  }, [cwd, clearMessages, setActiveSessionId, setConnected, setLoading, setShowExamples]);

  // Listen to message events
  useEffect(() => {
    if (!activeSessionId) return;

    const eventName = `cc-message:${activeSessionId}`;
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

    // If viewing history, first message will connect the session
    if (isViewingHistory) {
      setViewingHistory(false);
    }

    // Add user message to store
    addMessage({
      type: 'user',
      text: textToSend,
    });

    setInput('');
    setLoading(true);
    setShowExamples(false);

    try {
      // Backend will connect automatically on first message if not connected
      await invoke('cc_send_message', {
        sessionId: activeSessionId,
        message: textToSend,
      });

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
      await invoke('cc_interrupt', {
        sessionId: activeSessionId,
      });
    } catch (error) {
      console.error('Failed to interrupt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    // Append to input instead of replacing
    setInput((prev) => (prev ? prev + '\n\n' + prompt : prompt));
    setShowExamples(false);
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 shrink-0 flex gap-2 items-center border-b p-2 bg-background">
        <Button
          onClick={() => {
            handleNewSession();
            setShowExamples(false);
          }}
          disabled={isLoading}
          variant="default"
          size="icon"
          title="New Session"
        >
          <Pencil />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {activeSessionId && (
            <span className="text-xs text-muted-foreground">
              {activeSessionId.slice(0, 8)}... | {options.model ?? 'auto'}
            </span>
          )}
          {isConnected ? (
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              Connected
            </span>
          ) : isViewingHistory ? (
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
              Viewing History
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div ref={scrollContainerRef} className="h-full overflow-y-auto">
          <div className="flex flex-col gap-2 p-2">
            {messages.length === 0 && !isLoading && !showExamples && (
              <div className="border-b">
                <ExamplePrompts onSelectPrompt={handleExamplePrompt} />
              </div>
            )}
            {messages.map((msg, idx) => (
              <CCMessage key={idx} message={msg} index={idx} />
            ))}
            {isLoading && (
              <Card className="p-3 bg-gray-50 dark:bg-gray-900">
                <div className="text-xs text-muted-foreground animate-pulse">
                  Claude is thinking...
                </div>
              </Card>
            )}
          </div>
        </div>

        <CCScrollControls onScrollUp={handleScrollUp} onScrollDown={handleScrollDown} />
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
