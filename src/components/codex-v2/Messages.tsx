import { useEffect, useRef, useState } from "react";
import type { ConversationItem } from "@/types/codex-v2";
import { Markdown } from "./Markdown";
import { DiffBlock } from "./DiffBlock";
import { languageFromPath } from "@/utils/codex-v2/syntax";

type MessagesProps = {
  items: ConversationItem[];
  isThinking: boolean;
  threadId?: string | null;
};

type ToolSummary = {
  label: string;
  value?: string;
  detail?: string;
  output?: string;
};

type StatusTone = "completed" | "processing" | "failed" | "unknown";

function basename(path: string) {
  if (!path) {
    return "";
  }
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : path;
}

function parseToolArgs(detail: string) {
  if (!detail) {
    return null;
  }
  try {
    return JSON.parse(detail) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function firstStringField(
  source: Record<string, unknown> | null,
  keys: string[],
) {
  if (!source) {
    return "";
  }
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function toolNameFromTitle(title: string) {
  if (!title.toLowerCase().startsWith("tool:")) {
    return "";
  }
  const [, toolPart = ""] = title.split(":");
  const segments = toolPart.split("/").map((segment) => segment.trim());
  return segments.length ? segments[segments.length - 1] : "";
}

function buildToolSummary(
  item: Extract<ConversationItem, { kind: "tool" }>,
  commandText: string,
): ToolSummary {
  if (item.toolType === "commandExecution") {
    const cleanedCommand = cleanCommandText(commandText);
    return {
      label: "command",
      value: cleanedCommand || "Command",
      detail: "",
      output: item.output || "",
    };
  }

  if (item.toolType === "webSearch") {
    return {
      label: "searched",
      value: item.detail || "",
    };
  }

  if (item.toolType === "imageView") {
    const file = basename(item.detail || "");
    return {
      label: "read",
      value: file || "image",
    };
  }

  if (item.toolType === "mcpToolCall") {
    const toolName = toolNameFromTitle(item.title);
    const args = parseToolArgs(item.detail);
    if (toolName.toLowerCase().includes("search")) {
      return {
        label: "searched",
        value:
          firstStringField(args, ["query", "pattern", "text"]) || item.detail,
      };
    }
    if (toolName.toLowerCase().includes("read")) {
      const targetPath =
        firstStringField(args, ["path", "file", "filename"]) || item.detail;
      return {
        label: "read",
        value: basename(targetPath),
        detail: targetPath && targetPath !== basename(targetPath) ? targetPath : "",
      };
    }
    if (toolName) {
      return {
        label: "tool",
        value: toolName,
        detail: item.detail || "",
      };
    }
  }

  return {
    label: "tool",
    value: item.title || "",
    detail: item.detail || "",
    output: item.output || "",
  };
}

function cleanCommandText(commandText: string) {
  if (!commandText) {
    return "";
  }
  const trimmed = commandText.trim();
  const shellMatch = trimmed.match(
    /^(?:\/\S+\/)?(?:bash|zsh|sh|fish)(?:\.exe)?\s+-lc\s+(['"])([\s\S]+)\1$/,
  );
  const inner = shellMatch ? shellMatch[2] : trimmed;
  const cdMatch = inner.match(
    /^\s*cd\s+[^&;]+(?:\s*&&\s*|\s*;\s*)([\s\S]+)$/i,
  );
  const stripped = cdMatch ? cdMatch[1] : inner;
  return stripped.trim();
}

function statusToneFromText(status?: string): StatusTone {
  if (!status) {
    return "unknown";
  }
  const normalized = status.toLowerCase();
  if (/(fail|error)/.test(normalized)) {
    return "failed";
  }
  if (/(pending|running|processing|started|in_progress)/.test(normalized)) {
    return "processing";
  }
  if (/(complete|completed|success|done)/.test(normalized)) {
    return "completed";
  }
  return "unknown";
}

function toolStatusTone(
  item: Extract<ConversationItem, { kind: "tool" }>,
  hasChanges: boolean,
): StatusTone {
  const fromStatus = statusToneFromText(item.status);
  if (fromStatus !== "unknown") {
    return fromStatus;
  }
  if (item.output || hasChanges) {
    return "completed";
  }
  return "processing";
}

export function Messages({ items, isThinking, threadId }: MessagesProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [workingSince, setWorkingSince] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);
  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleItems = items;

  useEffect(() => {
    if (!bottomRef.current) {
      return undefined;
    }
    let raf1 = 0;
    let raf2 = 0;
    const target = bottomRef.current;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    });
    return () => {
      if (raf1) {
        window.cancelAnimationFrame(raf1);
      }
      if (raf2) {
        window.cancelAnimationFrame(raf2);
      }
    };
  }, [items.length, isThinking]);

  useEffect(() => {
    setWorkingSince(null);
    setElapsedMs(0);
    setLastDurationMs(null);
  }, [threadId]);

  useEffect(() => {
    if (isThinking) {
      if (!workingSince) {
        setWorkingSince(Date.now());
        setElapsedMs(0);
        setLastDurationMs(null);
      }
      return undefined;
    }
    if (workingSince) {
      setLastDurationMs(Date.now() - workingSince);
      setWorkingSince(null);
      setElapsedMs(0);
    }
    return undefined;
  }, [isThinking, workingSince]);

  useEffect(() => {
    if (!isThinking || !workingSince) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - workingSince);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isThinking, workingSince]);

  const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedRemainder = elapsedSeconds % 60;
  const formattedElapsed = `${elapsedMinutes}:${String(elapsedRemainder).padStart(2, "0")}`;
  const lastDurationSeconds = lastDurationMs
    ? Math.max(0, Math.floor(lastDurationMs / 1000))
    : 0;
  const lastDurationMinutes = Math.floor(lastDurationSeconds / 60);
  const lastDurationRemainder = lastDurationSeconds % 60;
  const formattedLastDuration = `${lastDurationMinutes}:${String(
    lastDurationRemainder,
  ).padStart(2, "0")}`;

  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 flex flex-col pt-3 pb-4 pl-8 pr-2 custom-scrollbar bg-[#080a10]/45"
    >
      {visibleItems.map((item) => {
        if (item.kind === "message") {
          return (
            <div key={item.id} className={`flex mb-3 ${item.role === 'user' ? 'justify-end pr-6' : ''}`}>
              <div className={`max-w-[85%] px-[14px] py-[10px] rounded-[14px] text-[14px] leading-[1.45] overflow-wrap-anywhere break-words shadow-sm ${item.role === 'user'
                ? 'bg-blue-500/40 text-white'
                : 'bg-white/[0.08] text-[#e6e7ea]'
                }`}>
                <Markdown value={item.text} className="markdown-compact" />
              </div>
            </div>
          );
        }
        if (item.kind === "reasoning") {
          const summaryText = item.summary || item.content;
          const summaryLines = summaryText
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const rawTitle =
            summaryLines.length > 0
              ? summaryLines[summaryLines.length - 1]
              : "Reasoning";
          const cleanTitle = rawTitle
            .replace(/[`*_~]/g, "")
            .replace(/\[(.*?)\]\(.*?\)/g, "$1")
            .trim();
          const summaryTitle =
            cleanTitle.length > 80
              ? `${cleanTitle.slice(0, 80)}…`
              : cleanTitle || "Reasoning";
          const reasoningTone: StatusTone = summaryText ? "completed" : "processing";
          const isExpanded = expandedItems.has(item.id);
          const normalizedSummaryText = summaryText.trim();
          const shouldHideReasoningBody =
            !normalizedSummaryText ||
            normalizedSummaryText === summaryTitle ||
            summaryLines.length <= 1;
          return (
            <div key={item.id} className="relative group/tool border-l-2 border-white/[0.08] pl-3 py-1 my-2 min-w-0">
              <button
                type="button"
                className="absolute -left-2 top-0 bottom-0 w-4 bg-transparent cursor-pointer z-10"
                onClick={() => toggleExpanded(item.id)}
                aria-expanded={expandedItems.has(item.id)}
                aria-label="Toggle reasoning details"
              />
              <div className="flex flex-col gap-1.5 min-w-0">
                <button
                  type="button"
                  className="flex items-center gap-2 text-[12px] font-semibold text-white/90 hover:text-white transition-colors text-left outline-none"
                  onClick={() => toggleExpanded(item.id)}
                  aria-expanded={expandedItems.has(item.id)}
                >
                  <span
                    className={`w-2 h-2 rounded-full ring-1 ring-white/[0.08] shrink-0 ${reasoningTone === 'completed' ? 'bg-[#78ebbe]' : 'bg-[#ffaf55] animate-pulse'
                      }`}
                    aria-hidden
                  />
                  <span className="truncate">{summaryTitle}</span>
                </button>
                {!shouldHideReasoningBody && summaryText && (
                  <div className={`text-[11px] text-[#ffffffbf] leading-[1.4] transition-all overflow-hidden ${isExpanded ? "" : "line-clamp-3"}`}>
                    <Markdown
                      value={summaryText}
                      className="markdown-compact"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        }
        if (item.kind === "review") {
          const title =
            item.state === "started" ? "Review started" : "Review completed";
          return (
            <div key={item.id} className="item-card review">
              <div className="review-header">
                <span className="review-title">{title}</span>
                <span
                  className={`review-badge ${item.state === "started" ? "active" : "done"
                    }`}
                >
                  Review
                </span>
              </div>
              {item.text && (
                <Markdown value={item.text} className="item-text markdown" />
              )}
            </div>
          );
        }
        if (item.kind === "diff") {
          return (
            <div key={item.id} className="item-card diff">
              <div className="diff-header">
                <span className="diff-title">{item.title}</span>
                {item.status && <span className="item-status">{item.status}</span>}
              </div>
              <div className="diff-viewer-output">
                <DiffBlock diff={item.diff} language={languageFromPath(item.title)} />
              </div>
            </div>
          );
        }
        if (item.kind === "tool") {
          const isFileChange = item.toolType === "fileChange";
          const isCommand = item.toolType === "commandExecution";
          const commandText = isCommand
            ? item.title.replace(/^Command:\s*/i, "").trim()
            : "";
          const summary = buildToolSummary(item, commandText);
          const changeNames = (item.changes ?? [])
            .map((change) => basename(change.path))
            .filter(Boolean);
          const hasChanges = changeNames.length > 0;
          const tone = toolStatusTone(item, hasChanges);
          const isExpanded = expandedItems.has(item.id);
          const summaryLabel = isFileChange
            ? changeNames.length > 1
              ? "files edited"
              : "file edited"
            : isCommand
              ? ""
              : summary.label;
          const summaryValue = isFileChange
            ? changeNames.length > 1
              ? `${changeNames[0]} +${changeNames.length - 1}`
              : changeNames[0] || "changes"
            : summary.value;

          return (
            <div
              key={item.id}
              className={`relative group/tool border-l-2 border-white/[0.08] pl-3 py-1 my-2 min-w-0 transition-all ${expandedItems.has(item.id) ? "mb-4" : ""
                }`}
            >
              <button
                type="button"
                className="absolute -left-2 top-0 bottom-0 w-4 bg-transparent cursor-pointer z-10"
                onClick={() => toggleExpanded(item.id)}
                aria-expanded={expandedItems.has(item.id)}
                aria-label="Toggle tool details"
              />
              <div className="flex flex-col gap-1.5 min-w-0">
                <button
                  type="button"
                  className="flex items-center gap-2 text-[12px] font-semibold text-white/90 hover:text-white transition-colors text-left outline-none"
                  onClick={() => toggleExpanded(item.id)}
                  aria-expanded={expandedItems.has(item.id)}
                >
                  <span className={`w-2 h-2 rounded-full ring-1 ring-white/[0.08] shrink-0 ${tone === 'completed' ? 'bg-[#78ebbe]' : tone === 'failed' ? 'bg-[#ff6e6e]' : 'bg-[#ffaf55] animate-pulse'
                    }`} aria-hidden />
                  <div className="flex items-baseline gap-1.5 min-w-0 truncate">
                    {summaryLabel && (
                      <span className="text-white/50 lowercase tracking-tight shrink-0">{summaryLabel}:</span>
                    )}
                    {summaryValue && (
                      <span
                        className={`truncate font-medium ${isCommand ? "font-mono text-[11px] bg-black/40 px-1.5 py-0.5 rounded border border-white/[0.06] text-white/80" : ""
                          }`}
                      >
                        {summaryValue}
                      </span>
                    )}
                  </div>
                </button>
                {isExpanded && summary.detail && !isFileChange && (
                  <div className="tool-inline-detail">
                    {summary.detail}
                  </div>
                )}
                {isExpanded && isCommand && item.detail && (
                  <div className="tool-inline-detail tool-inline-muted">
                    cwd: {item.detail}
                  </div>
                )}
                {isExpanded && isFileChange && hasChanges && (
                  <div className="tool-inline-change-list">
                    {item.changes?.map((change, index) => (
                      <div
                        key={`${change.path}-${index}`}
                        className="tool-inline-change"
                      >
                        <div className="tool-inline-change-header">
                          {change.kind && (
                            <span className="tool-inline-change-kind">
                              {change.kind.toUpperCase()}
                            </span>
                          )}
                          <span className="tool-inline-change-path">
                            {basename(change.path)}
                          </span>
                        </div>
                        {change.diff && (
                          <div className="diff-viewer-output">
                            <DiffBlock
                              diff={change.diff}
                              language={languageFromPath(change.path)}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && isFileChange && !hasChanges && item.detail && (
                  <Markdown value={item.detail} className="item-text markdown" />
                )}
                {isExpanded && summary.output && (!isFileChange || !hasChanges) && (
                  <Markdown
                    value={summary.output}
                    className="tool-inline-output markdown"
                    codeBlock
                  />
                )}
              </div>
            </div>
          );
        }
        return null;
      })}
      {isThinking && (
        <div className="inline-flex items-center gap-2.5 px-0 mt-1 mb-3 text-white/50 text-[12px] tracking-tight">
          <div className="w-[14px] h-[14px] rounded-full border-2 border-white/20 border-t-white/80 animate-spin" aria-hidden />
          <div className="flex items-center gap-1.5 tabular-nums text-white/90 font-medium">
            <span>{formattedElapsed}</span>
          </div>
          <span className="relative text-transparent bg-gradient-to-r from-white/30 via-white/95 to-white/30 bg-[length:200%_100%] bg-clip-text animate-[shimmer_2s_infinite_linear]">
            Working…
          </span>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes shimmer {
              from { background-position: 200% 0; }
              to { background-position: -200% 0; }
            }
          `}} />
        </div>
      )}
      {!isThinking && lastDurationMs !== null && items.length > 0 && (
        <div className="flex items-center gap-2.5 mx-6 mt-1.5 mb-3 text-white/30 text-[10px] uppercase tracking-[0.12em]" aria-live="polite">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" aria-hidden />
          <span className="whitespace-nowrap">
            Done in {formattedLastDuration}
          </span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" aria-hidden />
        </div>
      )}
      {!items.length && (
        <div className="empty messages-empty">
          Start a thread and send a prompt to the agent.
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
