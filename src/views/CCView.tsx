import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useCodexStore } from "@/stores/codex";
import { useCCStore, ModelType, PermissionMode, CCMessage } from "@/stores/ccStore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Pencil, Clock } from "lucide-react";
import { CCHistoryMessages } from "@/components/cc/CCHistoryMessage";

export default function CCView() {
  const { cwd } = useCodexStore();
  const {
    activeSessionId,
    messages,
    model,
    permissionMode,
    isConnected,
    isHistoryMode,
    setModel,
    setPermissionMode,
    addMessage,
    setConnected,
    setHistoryMode,
  } = useCCStore();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeSessionId && !isConnected && !isHistoryMode) {
      connectToSession();
    }
  }, [activeSessionId, isHistoryMode]);

  const connectToSession = async () => {
    if (!activeSessionId) return;

    try {
      setLoading(true);
      await invoke("cc_connect", {
        params: {
          sessionId: activeSessionId,
          cwd,
          model,
          permissionMode,
          resumeId: activeSessionId,
        },
      });
      setConnected(true);
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !activeSessionId || !isConnected) return;

    const userMessage: CCMessage = {
      role: "user",
      content: input,
    };

    addMessage(userMessage);
    setInput("");
    setLoading(true);

    try {
      await invoke("cc_send_message", {
        sessionId: activeSessionId,
        message: input,
      });

      const responses = await invoke<CCMessage[]>("cc_receive_response", {
        sessionId: activeSessionId,
      });

      responses.forEach((msg) => {
        addMessage({
          role: "assistant",
          content: msg.content,
        });
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      addMessage({
        role: "assistant",
        content: `Error: ${error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (value: string) => {
    setModel(value as ModelType);
  };

  const handlePermissionModeChange = (value: string) => {
    setPermissionMode(value as PermissionMode);
  };

  const handleNewSession = async () => {
    try {
      setLoading(true);
      const newSessionId = await invoke<string>("cc_new_session", {
        cwd,
        model,
        permissionMode,
      });

      useCCStore.getState().setActiveSessionId(newSessionId);
      useCCStore.getState().clearMessages();
      useCCStore.getState().setConnected(true);
      useCCStore.getState().addResumedId(newSessionId);
    } catch (error) {
      console.error("Failed to create new session:", error);
    } finally {
      setLoading(false);
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
    }
  };

  if (!activeSessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Select a session from the list or create a new one</p>
        <Button onClick={handleNewSession} disabled={loading}>
          New Session
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Fixed header */}
      <div className="shrink-0 flex gap-2 items-center border-b p-2 bg-background">
        <Button
          onClick={handleNewSession}
          disabled={loading}
          variant={isHistoryMode ? "outline" : "default"}
          size="icon"
        >
          <Pencil />
        </Button>
        <Button
          onClick={() => setHistoryMode(!isHistoryMode)}
          disabled={loading}
          variant={isHistoryMode ? "default" : "outline"}
          size="icon"
        >
          <Clock />
        </Button>

        <div className="ml-auto">
          {isConnected ? (
            <span className="text-sm text-green-600">Connected</span>
          ) : (
            <span className="text-sm text-muted-foreground">Disconnected</span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {isHistoryMode ? (
          <CCHistoryMessages project={cwd} sessionId={activeSessionId || ""} />
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-2 p-2">
                {messages.map((msg, idx) => (
                  <Card key={idx} className={`p-3 ${msg.role === "user" ? "bg-blue-50 dark:bg-blue-950" : ""}`}>
                    <div className="text-xs font-semibold mb-1 text-muted-foreground">
                      {msg.role === "user" ? "You" : "Claude"}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="shrink-0 flex gap-2 p-2 border-t">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1"
                rows={3}
                disabled={loading || !isConnected}
              />
              <Button onClick={handleSendMessage} disabled={loading || !isConnected}>
                {loading ? "Sending..." : "Send"}
              </Button>
              <Button onClick={handleInterrupt} disabled={!isConnected || loading} variant="outline" size="sm">
                Interrupt
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Fixed footer - Model & Permission selection */}
      <div className="shrink-0 flex gap-2 p-2 border-t bg-background">
        <Select value={model} onValueChange={handleModelChange}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sonnet">Sonnet</SelectItem>
            <SelectItem value="haiku">Haiku</SelectItem>
            <SelectItem value="opus">Opus</SelectItem>
          </SelectContent>
        </Select>

        <Select value={permissionMode} onValueChange={handlePermissionModeChange}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Permission mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="acceptEdits">Accept Edits</SelectItem>
            <SelectItem value="plan">Plan</SelectItem>
            <SelectItem value="bypassPermissions">Bypass</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
