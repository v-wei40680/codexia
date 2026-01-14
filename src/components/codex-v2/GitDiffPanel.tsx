import type { GitHubIssue, GitLogEntry } from "@/types/codex-v2";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import { GitBranch } from "lucide-react";
import { formatRelativeTime } from "@/utils/codex-v2/time";
import { cn } from "@/lib/utils";

type GitDiffPanelProps = {
  mode: "diff" | "log" | "issues";
  onModeChange: (mode: "diff" | "log" | "issues") => void;
  branchName: string;
  totalAdditions: number;
  totalDeletions: number;
  fileStatus: string;
  error?: string | null;
  logError?: string | null;
  logLoading?: boolean;
  logTotal?: number;
  logAhead?: number;
  logBehind?: number;
  logAheadEntries?: GitLogEntry[];
  logBehindEntries?: GitLogEntry[];
  logUpstream?: string | null;
  issues?: GitHubIssue[];
  issuesTotal?: number;
  issuesLoading?: boolean;
  issuesError?: string | null;
  gitRemoteUrl?: string | null;
  selectedPath?: string | null;
  onSelectFile?: (path: string) => void;
  files: {
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }[];
  logEntries: GitLogEntry[];
};

function splitPath(path: string) {
  const parts = path.split("/");
  if (parts.length === 1) {
    return { name: path, dir: "" };
  }
  return { name: parts[parts.length - 1], dir: parts.slice(0, -1).join("/") };
}

function splitNameAndExtension(name: string) {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === name.length - 1) {
    return { base: name, extension: "" };
  }
  return {
    base: name.slice(0, lastDot),
    extension: name.slice(lastDot + 1).toLowerCase(),
  };
}

function getStatusSymbol(status: string) {
  switch (status) {
    case "A":
      return "+";
    case "M":
      return "M";
    case "D":
      return "-";
    case "R":
      return "R";
    case "T":
      return "T";
    default:
      return "?";
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "A":
      return "diff-icon-added";
    case "M":
      return "diff-icon-modified";
    case "D":
      return "diff-icon-deleted";
    case "R":
      return "diff-icon-renamed";
    case "T":
      return "diff-icon-typechange";
    default:
      return "diff-icon-unknown";
  }
}

export function GitDiffPanel({
  mode,
  onModeChange,
  branchName,
  totalAdditions,
  totalDeletions,
  fileStatus,
  error,
  logError,
  logLoading = false,
  logTotal = 0,
  gitRemoteUrl = null,
  selectedPath,
  onSelectFile,
  files,
  logEntries,
  logAhead = 0,
  logBehind = 0,
  logAheadEntries = [],
  logBehindEntries = [],
  logUpstream = null,
  issues = [],
  issuesTotal = 0,
  issuesLoading = false,
  issuesError = null,
}: GitDiffPanelProps) {
  const githubBaseUrl = (() => {
    if (!gitRemoteUrl) {
      return null;
    }
    const trimmed = gitRemoteUrl.trim();
    if (!trimmed) {
      return null;
    }
    let path = "";
    if (trimmed.startsWith("git@github.com:")) {
      path = trimmed.slice("git@github.com:".length);
    } else if (trimmed.startsWith("ssh://git@github.com/")) {
      path = trimmed.slice("ssh://git@github.com/".length);
    } else if (trimmed.includes("github.com/")) {
      path = trimmed.split("github.com/")[1] ?? "";
    }
    path = path.replace(/\.git$/, "").replace(/\/$/, "");
    if (!path) {
      return null;
    }
    return `https://github.com/${path}`;
  })();

  async function showLogMenu(event: ReactMouseEvent<HTMLDivElement>, entry: GitLogEntry) {
    event.preventDefault();
    event.stopPropagation();
    const copyItem = await MenuItem.new({
      text: "Copy SHA",
      action: async () => {
        await navigator.clipboard.writeText(entry.sha);
      },
    });
    const items = [copyItem];
    if (githubBaseUrl) {
      const openItem = await MenuItem.new({
        text: "Open on GitHub",
        action: async () => {
          await openUrl(`${githubBaseUrl}/commit/${entry.sha}`);
        },
      });
      items.push(openItem);
    }
    const menu = await Menu.new({ items });
    const window = getCurrentWindow();
    const position = new LogicalPosition(event.clientX, event.clientY);
    await menu.popup(position, window);
  }
  const logCountLabel = logTotal
    ? `${logTotal} commit${logTotal === 1 ? "" : "s"}`
    : logEntries.length
      ? `${logEntries.length} commit${logEntries.length === 1 ? "" : "s"}`
    : "No commits";
  const logSyncLabel = logUpstream
    ? `↑${logAhead} ↓${logBehind}`
    : "No upstream configured";
  const logUpstreamLabel = logUpstream ? `Upstream ${logUpstream}` : "";
  const showAheadSection = logUpstream && logAhead > 0;
  const showBehindSection = logUpstream && logBehind > 0;
  const hasDiffTotals = totalAdditions > 0 || totalDeletions > 0;
  const diffTotalsLabel = `+${totalAdditions} / -${totalDeletions}`;
  const diffStatusLabel = hasDiffTotals
    ? [logUpstream ? logSyncLabel : null, diffTotalsLabel]
        .filter(Boolean)
        .join(" · ")
    : logUpstream
      ? `${logSyncLabel} · ${fileStatus}`
      : fileStatus;
  return (
    <aside className="flex min-h-0 flex-1 flex-col gap-2 p-3 pt-3 [ -webkit-app-region:no-drag ]">
      <div className="flex items-center justify-between text-[12px] tracking-[0.08em] uppercase text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5" />
          Git
        </div>
        <div
          className="inline-flex gap-0.5 rounded-full border border-border/60 bg-muted/30 p-0.5"
          role="tablist"
          aria-label="Git panel"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "diff"}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] tracking-[0.04em] uppercase transition-colors",
              mode === "diff"
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("diff")}
          >
            Diff
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "log"}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] tracking-[0.04em] uppercase transition-colors",
              mode === "log"
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("log")}
          >
            Log
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "issues"}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] tracking-[0.04em] uppercase transition-colors",
              mode === "issues"
                ? "bg-muted/60 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onModeChange("issues")}
          >
            Issues
          </button>
        </div>
      </div>
      {mode === "diff" ? (
        <>
          <div className="text-[11px] text-muted-foreground">{diffStatusLabel}</div>
        </>
      ) : mode === "log" ? (
        <>
          <div className="text-[11px] text-muted-foreground">{logCountLabel}</div>
          <div className="inline-flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            <span>{logSyncLabel}</span>
            {logUpstreamLabel && (
              <>
                <span className="text-muted-foreground/70">·</span>
                <span>{logUpstreamLabel}</span>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>GitHub issues</span>
            {issuesLoading && (
              <span
                className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-border border-t-foreground"
                aria-hidden
              />
            )}
          </div>
          <div className="inline-flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            <span>{issuesTotal} open</span>
          </div>
        </>
      )}
      {mode !== "issues" && (
        <div className="mb-1 text-[13px] font-semibold">
          {branchName || "unknown"}
        </div>
      )}
      {mode === "diff" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5">
          {error && (
            <div className="whitespace-pre-wrap text-[12px] text-destructive/90">
              {error}
            </div>
          )}
          {!error && !files.length && (
            <div className="text-[12px] text-muted-foreground">No changes detected.</div>
          )}
          {files.map((file) => {
            const { name, dir } = splitPath(file.path);
            const { base, extension } = splitNameAndExtension(name);
            const isSelected = file.path === selectedPath;
            const statusSymbol = getStatusSymbol(file.status);
            const statusClass = getStatusClass(file.status);
            return (
              <div
                key={file.path}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border px-1.5 py-1 transition-colors",
                  isSelected
                    ? "border-primary/30 bg-muted/40"
                    : "border-transparent hover:border-border/60 hover:bg-muted/30",
                )}
                role="button"
                tabIndex={0}
                onClick={() => onSelectFile?.(file.path)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectFile?.(file.path);
                  }
                }}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 place-items-center rounded text-[10px] font-bold leading-none",
                    statusClass === "diff-icon-added" &&
                      "border border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
                    statusClass === "diff-icon-modified" &&
                      "border border-amber-400/40 bg-amber-400/10 text-amber-300",
                    statusClass === "diff-icon-deleted" &&
                      "border border-rose-400/50 bg-rose-400/10 text-rose-300",
                    (statusClass === "diff-icon-renamed" ||
                      statusClass === "diff-icon-typechange" ||
                      statusClass === "diff-icon-unknown") &&
                      "border border-border/60 bg-muted/30 text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {statusSymbol}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center justify-between gap-2 text-[11px] text-foreground/90">
                    <span className="flex min-w-0 flex-1">
                      <span className="min-w-0 truncate">{base}</span>
                      {extension && (
                        <span className="shrink-0 whitespace-nowrap">.{extension}</span>
                      )}
                    </span>
                    <span className="inline-flex shrink-0 gap-0.5 whitespace-nowrap text-[10px] text-muted-foreground">
                      <span className="text-emerald-300">+{file.additions}</span>
                      <span className="text-muted-foreground/70">/</span>
                      <span className="text-rose-300">-{file.deletions}</span>
                    </span>
                  </div>
                  {dir && (
                    <div className="truncate text-[10px] text-muted-foreground">
                      {dir}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : mode === "log" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-0.5">
          {logError && (
            <div className="whitespace-pre-wrap text-[12px] text-destructive/90">
              {logError}
            </div>
          )}
          {!logError && logLoading && (
            <div className="text-[12px] text-muted-foreground">Loading commits...</div>
          )}
          {!logError &&
            !logLoading &&
            !logEntries.length &&
            !showAheadSection &&
            !showBehindSection && (
            <div className="text-[12px] text-muted-foreground">No commits yet.</div>
          )}
          {showAheadSection && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground">
                To push
              </div>
              <div className="flex flex-col gap-2">
                {logAheadEntries.map((entry) => (
                  <div
                    key={entry.sha}
                    className="cursor-context-menu border-b border-border/40 py-1 last:border-b-0"
                    onContextMenu={(event) => showLogMenu(event, entry)}
                  >
                    <div className="text-[12px] text-foreground/90">
                      {entry.summary || "No message"}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono text-[10px]">
                        {entry.sha.slice(0, 7)}
                      </span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>
                        {entry.author || "Unknown"}
                      </span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>
                        {new Date(entry.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showBehindSection && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground">
                To pull
              </div>
              <div className="flex flex-col gap-2">
                {logBehindEntries.map((entry) => (
                  <div
                    key={entry.sha}
                    className="cursor-context-menu border-b border-border/40 py-1 last:border-b-0"
                    onContextMenu={(event) => showLogMenu(event, entry)}
                  >
                    <div className="text-[12px] text-foreground/90">
                      {entry.summary || "No message"}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono text-[10px]">
                        {entry.sha.slice(0, 7)}
                      </span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>
                        {entry.author || "Unknown"}
                      </span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>
                        {new Date(entry.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(logEntries.length > 0 || logLoading) && (
            <div className="flex flex-col gap-1.5">
              <div className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground">
                Recent commits
              </div>
              <div className="flex flex-col gap-2">
                {logEntries.map((entry) => (
                  <div
                    key={entry.sha}
                    className="cursor-context-menu border-b border-border/40 py-1.5 last:border-b-0"
                    onContextMenu={(event) => showLogMenu(event, entry)}
                  >
                    <div className="text-[12px] text-foreground/90">
                      {entry.summary || "No message"}
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono text-[10px]">
                        {entry.sha.slice(0, 7)}
                      </span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>
                        {entry.author || "Unknown"}
                      </span>
                      <span className="text-muted-foreground/70">·</span>
                      <span>
                        {new Date(entry.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {issuesError && (
            <div className="whitespace-pre-wrap text-[12px] text-destructive/90">
              {issuesError}
            </div>
          )}
          {!issuesError && !issuesLoading && !issues.length && (
            <div className="text-[12px] text-muted-foreground">No open issues.</div>
          )}
          {issues.map((issue) => {
            const relativeTime = formatRelativeTime(new Date(issue.updatedAt).getTime());
            return (
              <a
                key={issue.number}
                className="border-b border-border/40 py-1.5 text-inherit no-underline last:border-b-0 hover:text-foreground"
                href={issue.url}
                onClick={(event) => {
                  event.preventDefault();
                  void openUrl(issue.url);
                }}
              >
                <div className="flex flex-wrap items-baseline gap-2 text-[12px] text-foreground/90">
                  <span className="min-w-0 flex-1 whitespace-normal">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      #{issue.number}
                    </span>{" "}
                    {issue.title}{" "}
                    <span className="text-muted-foreground">· {relativeTime}</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </aside>
  );
}
