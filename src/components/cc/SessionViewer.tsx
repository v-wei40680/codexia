import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { useNavigationStore } from "@/stores/navigationStore";
import { StreamMessage as StreamMessageComponent } from "./StreamMessage";
import { ErrorBoundary } from "./ErrorBoundary";

interface StreamMessage {
  type: "system" | "assistant" | "user" | "result";
  subtype?: string;
  message?: {
    content?: any[];
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  [key: string]: any;
}

function SessionDetail() {
  const { selectedSession } = useNavigationStore();
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawJsonlOutput, setRawJsonlOutput] = useState<string[]>([]);
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  // Load session history
  useEffect(() => {
    if (!selectedSession) return;

    const loadSessionHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const history = await api.loadSessionHistory(
          selectedSession.id,
          selectedSession.project_id
        );

        const loadedMessages: StreamMessage[] = history.map((entry) => ({
          ...entry,
          type: entry.type || "assistant",
        }));

        setMessages(loadedMessages);
        setRawJsonlOutput(history.map((h) => JSON.stringify(h)));

        // Auto-scroll to bottom
        setTimeout(() => {
          if (parentRef.current) {
            parentRef.current.scrollTop = parentRef.current.scrollHeight;
          }
        }, 100);
      } catch (err) {
        console.error("Failed to load session history:", err);
        setError("Failed to load session history");
      } finally {
        setLoading(false);
      }
    };

    loadSessionHistory();
  }, [selectedSession]);

  // Filter displayable messages
  const displayableMessages = useMemo(() => {
    return messages.filter((message, index) => {
      // Skip meta messages that don't have meaningful content
      if (message.isMeta && !message.leafUuid && !message.summary) {
        return false;
      }

      // Skip user messages that only contain tool results that are already displayed
      if (message.type === "user" && message.message) {
        if (message.isMeta) return false;

        const msg = message.message;
        if (!msg.content || (Array.isArray(msg.content) && msg.content.length === 0)) {
          return false;
        }

        if (Array.isArray(msg.content)) {
          let hasVisibleContent = false;
          for (const content of msg.content) {
            if (content.type === "text") {
              hasVisibleContent = true;
              break;
            }
            if (content.type === "tool_result") {
              let willBeSkipped = false;
              if (content.tool_use_id) {
                for (let i = index - 1; i >= 0; i--) {
                  const prevMsg = messages[i];
                  if (
                    prevMsg.type === "assistant" &&
                    prevMsg.message?.content &&
                    Array.isArray(prevMsg.message.content)
                  ) {
                    const toolUse = prevMsg.message.content.find(
                      (c: any) => c.type === "tool_use" && c.id === content.tool_use_id
                    );
                    if (toolUse) {
                      const toolName = toolUse.name?.toLowerCase();
                      const toolsWithWidgets = [
                        "task",
                        "edit",
                        "multiedit",
                        "todowrite",
                        "ls",
                        "read",
                        "glob",
                        "bash",
                        "write",
                        "grep",
                      ];
                      if (
                        toolsWithWidgets.includes(toolName) ||
                        toolUse.name?.startsWith("mcp__")
                      ) {
                        willBeSkipped = true;
                      }
                      break;
                    }
                  }
                }
              }
              if (!willBeSkipped) {
                hasVisibleContent = true;
                break;
              }
            }
          }
          if (!hasVisibleContent) {
            return false;
          }
        }
      }
      return true;
    });
  }, [messages]);

  const handleCopyAsJsonl = async () => {
    const jsonl = rawJsonlOutput.join("\n");
    await navigator.clipboard.writeText(jsonl);
    setCopyPopoverOpen(false);
  };

  const handleCopyAsMarkdown = async () => {
    let markdown = `# Claude Code Session\n\n`;
    if (selectedSession) {
      markdown += `**Project:** ${selectedSession.project_path}\n`;
      markdown += `**Session ID:** ${selectedSession.id}\n`;
    }
    markdown += `**Date:** ${new Date().toISOString()}\n\n---\n\n`;

    for (const msg of messages) {
      if (msg.type === "system" && msg.subtype === "init") {
        markdown += `## System Initialization\n\n`;
        markdown += `- Session ID: \`${msg.session_id || "N/A"}\`\n`;
        markdown += `- Model: \`${msg.model || "default"}\`\n`;
        if (msg.cwd) markdown += `- Working Directory: \`${msg.cwd}\`\n`;
        if (msg.tools?.length) markdown += `- Tools: ${msg.tools.join(", ")}\n`;
        markdown += `\n`;
      } else if (msg.type === "assistant" && msg.message) {
        markdown += `## Assistant\n\n`;
        for (const content of msg.message.content || []) {
          if (content.type === "text") {
            const textContent =
              typeof content.text === "string"
                ? content.text
                : content.text?.text || JSON.stringify(content.text || content);
            markdown += `${textContent}\n\n`;
          } else if (content.type === "tool_use") {
            markdown += `### Tool: ${content.name}\n\n`;
            markdown += `\`\`\`json\n${JSON.stringify(content.input, null, 2)}\n\`\`\`\n\n`;
          }
        }
        if (msg.message.usage) {
          markdown += `*Tokens: ${msg.message.usage.input_tokens} in, ${msg.message.usage.output_tokens} out*\n\n`;
        }
      } else if (msg.type === "user" && msg.message) {
        markdown += `## User\n\n`;
        for (const content of msg.message.content || []) {
          if (content.type === "text") {
            const textContent =
              typeof content.text === "string"
                ? content.text
                : content.text?.text || JSON.stringify(content.text);
            markdown += `${textContent}\n\n`;
          } else if (content.type === "tool_result") {
            markdown += `### Tool Result\n\n`;
            let contentText = "";
            if (typeof content.content === "string") {
              contentText = content.content;
            } else if (content.content && typeof content.content === "object") {
              if (content.content.text) {
                contentText = content.content.text;
              } else if (Array.isArray(content.content)) {
                contentText = content.content
                  .map((c: any) =>
                    typeof c === "string" ? c : c.text || JSON.stringify(c)
                  )
                  .join("\n");
              } else {
                contentText = JSON.stringify(content.content, null, 2);
              }
            }
            markdown += `\`\`\`\n${contentText}\n\`\`\`\n\n`;
          }
        }
      } else if (msg.type === "result") {
        markdown += `## Execution Result\n\n`;
        if (msg.result) {
          markdown += `${msg.result}\n\n`;
        }
        if (msg.error) {
          markdown += `**Error:** ${msg.error}\n\n`;
        }
      }
    }

    await navigator.clipboard.writeText(markdown);
    setCopyPopoverOpen(false);
  };

  if (!selectedSession) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        No session selected
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-2 flex items-center justify-between shrink-0">
        <h2 className="font-semibold">Session</h2>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Popover
              trigger={
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              }
              content={
                <div className="w-44 p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAsJsonl}
                    className="w-full justify-start text-xs"
                  >
                    Copy as JSONL
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAsMarkdown}
                    className="w-full justify-start text-xs"
                  >
                    Copy as Markdown
                  </Button>
                </div>
              }
              open={copyPopoverOpen}
              onOpenChange={setCopyPopoverOpen}
              align="end"
            />
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading session history...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : displayableMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages in this session
          </div>
        ) : (
          <AnimatePresence>
            {displayableMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ErrorBoundary>
                  <StreamMessageComponent message={message} streamMessages={messages} />
                </ErrorBoundary>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// Main SessionViewer component that shows session details
export function SessionViewer() {
  const { selectedSession } = useNavigationStore();

  if (!selectedSession) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>Select a session from the left panel</p>
      </div>
    );
  }

  return <SessionDetail />;
}
