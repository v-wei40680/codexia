import { useRef } from "react";
import { useSessionData } from "@/hooks/useSessionData";
import ReviewHeader from "./review/ReviewHeader";
import ReviewMessages from "./review/ReviewMessages";
import ScrollButtons from "./review/ScrollButtons";
import { runCommand } from "@/utils/runCommand";

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

  return (
    <div className="flex flex-1 flex-col w-full h-full min-h-0">
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
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <ReviewMessages
          messages={messages}
          isSessionLoading={isSessionLoading}
          hasSelection={hasSelection}
          hasMessages={hasMessages}
        />
      </div>
      <ScrollButtons
        onScrollToTop={scrollToTop}
        onScrollToBottom={scrollToBottom}
        hasMessages={hasMessages}
      />
    </div>
  );
}
