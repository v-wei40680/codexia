import { useRef } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { useSessionData } from "@/hooks/useSessionData";
import ReviewHeader from "./review/ReviewHeader";
import ReviewMessages from "./review/ReviewMessages";
import ScrollButtons from "./review/ScrollButtons";

export default function Review({ summary }: { summary: any }) {
  const {
    sessionId,
    cwd,
    instructions,
    totalTokens,
    messages,
    isSessionLoading,
    sessionError,
    hasMessages,
    hasSelection,
    refresh,
  } = useSessionData(summary);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = () => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
  };
  const scrollToBottom = () => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const runCommand = async (conversationId: string, cwd: string) => {
    const cmd = `cd ${cwd} && codex resume ${conversationId}`;
    try {
      await invoke("open_terminal_with_command", { command: cmd });
    } catch (err) {
      console.error("Failed to open terminal:", err);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen">
      <ReviewHeader
        cwd={cwd}
        instructions={instructions}
        totalTokens={totalTokens}
        sessionId={sessionId}
        onRunCommand={runCommand}
        onRefresh={refresh}
        isSessionLoading={isSessionLoading}
        hasSelection={hasSelection}
        sessionError={sessionError}
      />
      <ReviewMessages
        messages={messages}
        isSessionLoading={isSessionLoading}
        hasSelection={hasSelection}
        hasMessages={hasMessages}
        messagesContainerRef={messagesContainerRef}
      />
      <ScrollButtons
        onScrollToTop={scrollToTop}
        onScrollToBottom={scrollToBottom}
        hasMessages={hasMessages}
      />
    </div>
  );
}
