import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCCStore, CCMessage as CCMessageType } from "@/stores/ccStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Pencil, CircleStop, Send, Settings, ArrowUp, ArrowDown } from "lucide-react";
import { CCMessage } from "@/components/cc/CCMessage";
import { CCFooter } from "@/components/cc/CCFooter";
import { ExamplePrompts } from "@/components/cc/ExamplePrompts";
import { useCCSessionManager } from "@/hooks/useCCSessionManager";

export default function CCView() {
  const {
    activeSessionId,
    messages,
    options,
    isConnected,
    isLoading,
    showExamples,
    showFooter,
    isViewingHistory,
    addMessage,
    setLoading,
    setShowExamples,
    setShowFooter,
    setConnected,
    setViewingHistory,
  } = useCCStore();

  const { handleNewSession } = useCCSessionManager();
  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Listen to message events
  useEffect(() => {
    if (!activeSessionId) return;

    const eventName = `cc-message:${activeSessionId}`;
    const unlisten = listen<CCMessageType>(eventName, (event) => {
      const message = event.payload;
      addMessage(message);

      // Set loading to false when we receive a Result message
      if (message.type === "result") {
        setLoading(false);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeSessionId, addMessage, setLoading]);

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

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
      type: "user",
      text: textToSend,
    });

    setInput("");
    setLoading(true);
    setShowExamples(false);

    try {
      // Backend will connect automatically on first message if not connected
      await invoke("cc_send_message", {
        sessionId: activeSessionId,
        message: textToSend,
      });

      // Mark as connected after successfully sending message
      if (!isConnected) {
        setConnected(true);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setLoading(false);
      addMessage({
        type: "assistant",
        message: {
          content: [
            {
              type: "text",
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
      await invoke("cc_interrupt", {
        sessionId: activeSessionId,
      });
    } catch (error) {
      console.error("Failed to interrupt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    // Append to input instead of replacing
    setInput((prev) => (prev ? prev + "\n\n" + prompt : prompt));
    setShowExamples(false);
  };

  const handleScrollUp = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handleScrollDown = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
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
              {activeSessionId.slice(0, 8)}... | {options.model ?? "auto"}
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
          <div className="flex flex-col">
            {/* Examples */}
            {showExamples && (
              <div className="border-b">
                <ExamplePrompts onSelectPrompt={handleExamplePrompt} />
              </div>
            )}

            {/* Messages area */}
            <div className="flex flex-col gap-2 p-2">
              {messages.length === 0 && !isLoading && !showExamples && (
                <Card className="p-4 m-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Type your message below and press Enter to start a conversation with Claude Code.
                  </p>
                </Card>
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
        </div>

        {/* Fixed scroll controls - bottom right */}
        <div className="fixed bottom-20 right-4 flex shadow-lg">
          <Button onClick={handleScrollUp} variant="outline" size="icon" className="h-8 w-8 rounded-r-none border-r-0">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button onClick={handleScrollDown} variant="outline" size="icon" className="h-8 w-8 rounded-l-none">
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fixed input area */}
      <div className="shrink-0 flex gap-2 p-2 border-t bg-background">
        <Button
          onClick={() => setShowFooter(!showFooter)}
          size="icon"
          variant="ghost"
          title="Toggle Options"
        >
          <Settings className={showFooter ? "text-primary" : ""} />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!isLoading) {
                handleSendMessage();
              }
            }
          }}
          onFocus={() => setShowExamples(false)}
          placeholder="Ask Claude Code to write code, fix bugs, explain concepts..."
          className="flex-1"
          rows={3}
          disabled={isLoading}
        />
        <Button
          onClick={isLoading ? handleInterrupt : () => handleSendMessage()}
          size="icon"
          variant={isLoading ? "destructive" : "default"}
          disabled={!input.trim() && !isLoading}
        >
          {isLoading ? <CircleStop /> : <Send />}
        </Button>
      </div>

      {/* Fixed footer - Options */}
      {showFooter && <CCFooter />}
    </div>
  );
}
