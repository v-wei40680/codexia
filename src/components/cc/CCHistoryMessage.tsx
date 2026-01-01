import { useEffect, useState, useRef } from "react";
import { invoke } from "@/lib/tauri-proxy";
import { Badge } from "../ui/badge";
import { MarkdownRenderer } from "../chat/MarkdownRenderer";
import { Button } from "../ui/button";
import { ArrowUp, ArrowDown } from "lucide-react";
import { DiffMessage } from "./DiffMessage";

type MessageContent = {
  type: string;
  summary?: string;
  content?: string;
  message: {
    content:
      | string
      | Array<{
          type: string;
          content?: string;
          text?: string;
          thinking?: string;
          name?: string;
          input?: Record<string, string>;
        }>;
  };
};

type Props = {
  project: string;
  sessionId: string;
};

export function CCHistoryMessages({ project, sessionId }: Props) {
  const [messages, setMessages] = useState<MessageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const dir = project.replace(/\//g, "-").replace(/\\/g, "-");
        const lines = await invoke<string[]>("read_text_file_lines", {
          filePath: `~/.claude/projects/${dir}/${sessionId}.jsonl`,
        });

        const parsedMessages: MessageContent[] = [];
        for (const line of lines) {
          const sanitized = line.replace(/\u0000/g, "").trim();
          if (!sanitized || !sanitized.endsWith("}")) continue;

          try {
            const data = JSON.parse(sanitized) as MessageContent;
            parsedMessages.push(data);
          } catch (e) {
            console.error("Failed to parse message line:", e);
          }
        }
        setMessages(parsedMessages);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load history";
        setError(message);
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [project, sessionId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="text-sm text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="text-sm text-destructive">Error: {error}</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="text-sm text-muted-foreground">No history found</div>
      </div>
    );
  }

  const renderMessageContent = (obj: MessageContent) => {
    const { type, message, summary, content } = obj;

    switch (type) {
      case "summary":
        return <div>{summary}</div>;
      case "system":
        return <div>{content}</div>;
      case "user":
        return (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 max-w-full overflow-hidden">
            <div className="text-xs font-semibold text-blue-900 mb-2">USER</div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {typeof message.content === "string" ? (
                <MarkdownRenderer content={message.content} />
              ) : (
                (message.content[0].content ?? (
                  <pre className="text-sm overflow-auto break-all whitespace-pre-wrap max-w-full">
                    <code>{JSON.stringify(message.content, null, 2)}</code>
                  </pre>
                ))
              )}
            </div>
          </div>
        );

      case "assistant":
        if (!Array.isArray(message.content)) {
          return (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-w-full overflow-hidden">
              <div className="text-xs font-semibold text-gray-900 mb-2">
                ASSISTANT
              </div>
              <pre className="text-sm overflow-auto break-all whitespace-pre-wrap max-w-full">
                <code>{JSON.stringify(message.content, null, 2)}</code>
              </pre>
            </div>
          );
        }

        return message.content.map((block, idx) => {
          const blockKey = `${type}-${idx}`;
          switch (block.type) {
            case "text":
              return (
                <div
                  key={blockKey}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-w-full overflow-hidden"
                >
                  <div className="text-xs font-semibold text-gray-900 mb-2">
                    ASSISTANT
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {block.text}
                  </div>
                </div>
              );

            case "thinking":
              return (
                <div
                  key={blockKey}
                  className="rounded-lg border border-amber-200 bg-amber-50 p-3 max-w-full overflow-hidden"
                >
                  <div className="text-xs font-semibold text-amber-900 mb-2">
                    THINKING
                  </div>
                  <div className="text-sm text-amber-900 whitespace-pre-wrap break-words">
                    {block.thinking}
                  </div>
                </div>
              );

            case "tool_use":
              return (
                <div
                  key={blockKey}
                  className="rounded-lg border border-purple-200 bg-purple-50 p-3 max-w-full overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-semibold text-purple-900">
                      TOOL USE
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {block.name}
                    </Badge>
                    {["Read", "Edit", "Write"].includes(
                      block.name as string,
                    ) && (
                      <Badge variant="outline" className="text-xs">
                        {block.input?.file_path}
                      </Badge>
                    )}
                    {block.name === "Read" && (
                      <>
                        <Badge variant="outline" className="text-xs">
                          {block.input?.offset}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {block.input?.limit}
                        </Badge>
                      </>
                    )}
                    {block.name === "Glob" && (
                      <Badge variant="outline" className="text-xs">
                        {block.input?.pattern}
                      </Badge>
                    )}
                  </div>
                  {!["Read", "Edit", "Glob", "Write"].includes(
                    block.name as string,
                  ) && (
                    <pre className="text-sm overflow-auto bg-white rounded border p-2 break-all whitespace-pre-wrap max-w-full">
                      <code>{JSON.stringify(block.input, null, 2)}</code>
                    </pre>
                  )}
                  {block.name === "Edit" && (
                    <DiffMessage
                      oldString={block.input?.old_string || ""}
                      newString={block.input?.new_string || ""}
                    />
                  )}
                  {block.name === "Write" && (
                    <MarkdownRenderer
                      content={block.input?.content as string}
                    />
                  )}
                </div>
              );

            default:
              return (
                <div
                  key={blockKey}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-w-full overflow-hidden"
                >
                  <pre className="text-sm overflow-auto break-all whitespace-pre-wrap max-w-full">
                    <code>{JSON.stringify(block, null, 2)}</code>
                  </pre>
                </div>
              );
          }
        });

      case "file-history-snapshot":
        return null;

      default:
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-w-full overflow-hidden">
            <pre className="text-sm overflow-auto break-all whitespace-pre-wrap max-w-full">
              <code>{JSON.stringify(obj, null, 2)}</code>
            </pre>
          </div>
        );
    }
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
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Messages container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto flex flex-col gap-3 p-4 min-h-0"
      >
        {messages.map((message, idx) => (
          <div key={idx}>{renderMessageContent(message)}</div>
        ))}
      </div>

      {/* Fixed scroll controls - bottom right */}
      <div className="fixed bottom-4 right-4 flex gap-2">
        <Button onClick={handleScrollUp} variant="outline" size="icon" className="shadow-lg">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button onClick={handleScrollDown} variant="outline" size="icon" className="shadow-lg">
          <ArrowDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
