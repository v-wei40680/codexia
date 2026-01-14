import type { RateLimitSnapshot, ThreadSummary, WorkspaceInfo } from "@/types/codex-v2";
import { FolderKanban, Layers, Settings, TerminalSquare } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

type SidebarProps = {
  workspaces: WorkspaceInfo[];
  threadsByWorkspace: Record<string, ThreadSummary[]>;
  threadStatusById: Record<
    string,
    { isProcessing: boolean; hasUnread: boolean; isReviewing: boolean }
  >;
  threadListLoadingByWorkspace: Record<string, boolean>;
  activeWorkspaceId: string | null;
  activeThreadId: string | null;
  accountRateLimits: RateLimitSnapshot | null;
  onOpenSettings: () => void;
  onOpenDebug: () => void;
  hasDebugAlerts: boolean;
  onAddWorkspace: () => void;
  onSelectHome: () => void;
  onSelectWorkspace: (id: string) => void;
  onConnectWorkspace: (workspace: WorkspaceInfo) => void;
  onAddAgent: (workspace: WorkspaceInfo) => void;
  onAddWorktreeAgent: (workspace: WorkspaceInfo) => void;
  onToggleWorkspaceCollapse: (workspaceId: string, collapsed: boolean) => void;
  onSelectThread: (workspaceId: string, threadId: string) => void;
  onDeleteThread: (workspaceId: string, threadId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onDeleteWorktree: (workspaceId: string) => void;
};

export function Sidebar({
  workspaces,
  threadsByWorkspace,
  threadStatusById,
  threadListLoadingByWorkspace,
  activeWorkspaceId,
  activeThreadId,
  accountRateLimits,
  onOpenSettings,
  onOpenDebug,
  hasDebugAlerts,
  onAddWorkspace,
  onSelectHome,
  onSelectWorkspace,
  onConnectWorkspace,
  onAddAgent,
  onAddWorktreeAgent,
  onToggleWorkspaceCollapse,
  onSelectThread,
  onDeleteThread,
  onDeleteWorkspace,
  onDeleteWorktree,
}: SidebarProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState(
    new Set<string>(),
  );
  const [addMenuAnchor, setAddMenuAnchor] = useState<{
    workspaceId: string;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarBodyRef = useRef<HTMLDivElement | null>(null);
  const [scrollFade, setScrollFade] = useState({ top: false, bottom: false });

  const updateScrollFade = useCallback(() => {
    const node = sidebarBodyRef.current;
    if (!node) {
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = node;
    const canScroll = scrollHeight > clientHeight;
    const next = {
      top: canScroll && scrollTop > 0,
      bottom: canScroll && scrollTop + clientHeight < scrollHeight - 1,
    };
    setScrollFade((prev) =>
      prev.top === next.top && prev.bottom === next.bottom ? prev : next,
    );
  }, []);

  useEffect(() => {
    if (!addMenuAnchor) {
      return;
    }
    function handlePointerDown(event: Event) {
      const target = event.target as Node | null;
      if (addMenuRef.current && target && addMenuRef.current.contains(target)) {
        return;
      }
      setAddMenuAnchor(null);
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handlePointerDown, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handlePointerDown, true);
    };
  }, [addMenuAnchor]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollFade);
    return () => cancelAnimationFrame(frame);
  }, [updateScrollFade, workspaces, threadsByWorkspace, expandedWorkspaces]);

  async function showThreadMenu(
    event: React.MouseEvent,
    workspaceId: string,
    threadId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const archiveItem = await MenuItem.new({
      text: "Archive",
      action: () => onDeleteThread(workspaceId, threadId),
    });
    const copyItem = await MenuItem.new({
      text: "Copy ID",
      action: async () => {
        await navigator.clipboard.writeText(threadId);
      },
    });
    const menu = await Menu.new({ items: [copyItem, archiveItem] });
    const window = getCurrentWindow();
    const position = new LogicalPosition(event.clientX, event.clientY);
    await menu.popup(position, window);
  }

  async function showWorkspaceMenu(
    event: React.MouseEvent,
    workspaceId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const deleteItem = await MenuItem.new({
      text: "Delete",
      action: () => onDeleteWorkspace(workspaceId),
    });
    const menu = await Menu.new({ items: [deleteItem] });
    const window = getCurrentWindow();
    const position = new LogicalPosition(event.clientX, event.clientY);
    await menu.popup(position, window);
  }

  async function showWorktreeMenu(
    event: React.MouseEvent,
    workspaceId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const deleteItem = await MenuItem.new({
      text: "Delete worktree",
      action: () => onDeleteWorktree(workspaceId),
    });
    const menu = await Menu.new({ items: [deleteItem] });
    const window = getCurrentWindow();
    const position = new LogicalPosition(event.clientX, event.clientY);
    await menu.popup(position, window);
  }

  const usagePercent = accountRateLimits?.primary?.usedPercent;
  const globalUsagePercent = accountRateLimits?.secondary?.usedPercent;
  const credits = accountRateLimits?.credits ?? null;
  const creditsLabel = credits?.hasCredits
    ? credits.unlimited
      ? "Credits: unlimited"
      : credits.balance
        ? `Credits: ${credits.balance}`
        : "Credits"
    : null;

  const clampPercent = (value: number) =>
    Math.min(Math.max(Math.round(value), 0), 100);
  const sessionPercent =
    typeof usagePercent === "number" ? clampPercent(usagePercent) : null;
  const weeklyPercent =
    typeof globalUsagePercent === "number" ? clampPercent(globalUsagePercent) : null;
  const sessionLabel = "Session";
  const weeklyLabel = "Weekly";

  const rootWorkspaces = workspaces
    .filter((entry) => (entry.kind ?? "main") !== "worktree" && !entry.parentId)
    .slice()
    .sort((a, b) => {
      const aOrder =
        typeof a.settings.sortOrder === "number"
          ? a.settings.sortOrder
          : Number.MAX_SAFE_INTEGER;
      const bOrder =
        typeof b.settings.sortOrder === "number"
          ? b.settings.sortOrder
          : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.name.localeCompare(b.name);
    });
  const worktreesByParent = new Map<string, WorkspaceInfo[]>();
  workspaces
    .filter((entry) => (entry.kind ?? "main") === "worktree" && entry.parentId)
    .forEach((entry) => {
      const parentId = entry.parentId as string;
      const list = worktreesByParent.get(parentId) ?? [];
      list.push(entry);
      worktreesByParent.set(parentId, list);
    });
  worktreesByParent.forEach((entries) => {
    entries.sort((a, b) => a.name.localeCompare(b.name));
  });

  return (
    <aside className="flex flex-col h-full bg-[#121212]/35 backdrop-blur-[32px] backdrop-saturate-[1.35] border-r border-white/[0.08] overflow-hidden select-none relative">
      <div className="flex items-center justify-between px-5 pt-9 pb-3 shrink-0">
        <div>
          <button
            className="text-[20px] font-semibold flex items-center gap-2 hover:text-white transition-colors"
            onClick={onSelectHome}
            data-tauri-drag-region="false"
            aria-label="Open home"
          >
            <FolderKanban className="w-4 h-4" />
            Projects
          </button>
        </div>
        <button
          className="w-[22px] h-[22px] rounded-full border border-white/[0.18] bg-white/[0.06] text-white/70 flex items-center justify-center text-sm leading-none hover:bg-white/[0.12] hover:text-white transition-all active:scale-95"
          onClick={onAddWorkspace}
          data-tauri-drag-region="false"
          aria-label="Add workspace"
        >
          +
        </button>
      </div>
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-5 space-y-2 py-1 custom-scrollbar"
        onScroll={updateScrollFade}
        ref={sidebarBodyRef}
        style={{
          maskImage: scrollFade.top && scrollFade.bottom
            ? 'linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)'
            : scrollFade.top
              ? 'linear-gradient(to bottom, transparent 0, #000 16px, #000 100%)'
              : scrollFade.bottom
                ? 'linear-gradient(to bottom, #000 0, #000 calc(100% - 16px), transparent 100%)'
                : 'none'
        }}
      >
        <div className="flex flex-col gap-[10px]">
          {rootWorkspaces.map((entry) => {
            const threads = threadsByWorkspace[entry.id] ?? [];
            const isCollapsed = entry.settings.sidebarCollapsed;
            const showThreads = !isCollapsed && threads.length > 0;
            const isLoadingThreads =
              threadListLoadingByWorkspace[entry.id] ?? false;
            const showThreadLoader =
              !isCollapsed && isLoadingThreads && threads.length === 0;
            const worktrees = worktreesByParent.get(entry.id) ?? [];

            return (
              <div key={entry.id} className="flex flex-col gap-[6px] group/workspace">
                <div
                  className={`flex items-center justify-between px-1 py-1 group/row cursor-pointer transition-all border-l-2 ${entry.id === activeWorkspaceId
                    ? "border-blue-400/60 bg-transparent"
                    : "border-transparent hover:bg-white/[0.04]"
                    }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectWorkspace(entry.id)}
                  onContextMenu={(event) => showWorkspaceMenu(event, entry.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectWorkspace(entry.id);
                    }
                  }}
                >
                  <div className="flex-1 min-w-0 pr-2 pl-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[14px] font-semibold truncate ${entry.id === activeWorkspaceId ? "text-white" : "text-[#e6e7ea]"}`}>
                          {entry.name}
                        </span>
                        <button
                          className={`p-0.5 text-white/50 hover:text-white transition-all active:scale-90 ${isCollapsed ? "opacity-0 group-hover/row:opacity-100" : "rotate-90 opacity-100"}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleWorkspaceCollapse(entry.id, !isCollapsed);
                          }}
                          data-tauri-drag-region="false"
                        >
                          <span className="text-[10px] leading-none select-none">›</span>
                        </button>
                      </div>
                      <button
                        className="opacity-0 group-hover/row:opacity-100 w-[20px] h-[20px] rounded-full border border-white/[0.14] bg-white/[0.06] text-white/60 flex items-center justify-center text-[12px] leading-none hover:bg-white/[0.12] hover:text-white transition-all active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          const rect = (
                            event.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          const menuWidth = 200;
                          const left = Math.min(
                            Math.max(rect.left, 12),
                            window.innerWidth - menuWidth - 12,
                          );
                          const top = rect.bottom + 8;
                          setAddMenuAnchor((prev) =>
                            prev?.workspaceId === entry.id
                              ? null
                              : {
                                workspaceId: entry.id,
                                top,
                                left,
                                width: menuWidth,
                              },
                          );
                        }}
                        data-tauri-drag-region="false"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {!entry.connected && (
                    <span
                      className="text-[11px] text-white/60 bg-transparent border border-white/[0.15] px-2 py-0.5 rounded-full hover:border-white/40 transition-colors shrink-0 mr-1"
                      onClick={(event) => {
                        event.stopPropagation();
                        onConnectWorkspace(entry);
                      }}
                    >
                      connect
                    </span>
                  )}
                </div>
                {addMenuAnchor?.workspaceId === entry.id &&
                  createPortal(
                    <div
                      className="fixed z-[9999] bg-[#0c101a]/94 border border-white/[0.06] rounded-lg shadow-2xl py-1.5 overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                      ref={addMenuRef}
                      style={{
                        top: addMenuAnchor.top,
                        left: addMenuAnchor.left,
                        width: addMenuAnchor.width,
                      }}
                    >
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/[0.05] transition-colors outline-none"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAddMenuAnchor(null);
                          onAddAgent(entry);
                        }}
                      >
                        New agent
                      </button>
                      <button
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/[0.05] transition-colors outline-none"
                        onClick={(event) => {
                          event.stopPropagation();
                          setAddMenuAnchor(null);
                          onAddWorktreeAgent(entry);
                        }}
                      >
                        New worktree agent
                      </button>
                    </div>,
                    document.body,
                  )}
                {!isCollapsed && worktrees.length > 0 && (
                  <div className="worktree-section">
                    <div className="worktree-header">
                      <Layers className="worktree-header-icon" aria-hidden />
                      Worktrees
                    </div>
                    <div className="worktree-list">
                      {worktrees.map((worktree) => {
                        const worktreeThreads =
                          threadsByWorkspace[worktree.id] ?? [];
                        const worktreeCollapsed =
                          worktree.settings.sidebarCollapsed;
                        const showWorktreeThreads =
                          !worktreeCollapsed && worktreeThreads.length > 0;
                        const isLoadingWorktreeThreads =
                          threadListLoadingByWorkspace[worktree.id] ?? false;
                        const showWorktreeLoader =
                          !worktreeCollapsed &&
                          isLoadingWorktreeThreads &&
                          worktreeThreads.length === 0;
                        const worktreeBranch = worktree.worktree?.branch ?? "";

                        return (
                          <div key={worktree.id} className="worktree-card">
                            <div
                              className={`worktree-row ${worktree.id === activeWorkspaceId ? "active" : ""
                                }`}
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelectWorkspace(worktree.id)}
                              onContextMenu={(event) =>
                                showWorktreeMenu(event, worktree.id)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  onSelectWorkspace(worktree.id);
                                }
                              }}
                            >
                              <div className="worktree-label">
                                {worktreeBranch || worktree.name}
                              </div>
                              <div className="worktree-actions">
                                <button
                                  className={`worktree-toggle ${worktreeCollapsed ? "" : "expanded"
                                    }`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onToggleWorkspaceCollapse(
                                      worktree.id,
                                      !worktreeCollapsed,
                                    );
                                  }}
                                  data-tauri-drag-region="false"
                                  aria-label={
                                    worktreeCollapsed ? "Show agents" : "Hide agents"
                                  }
                                  aria-expanded={!worktreeCollapsed}
                                >
                                  <span className="worktree-toggle-icon">›</span>
                                </button>
                                {!worktree.connected && (
                                  <span
                                    className="connect"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onConnectWorkspace(worktree);
                                    }}
                                  >
                                    connect
                                  </span>
                                )}
                              </div>
                            </div>
                            {showWorktreeThreads && (
                              <div className="thread-list thread-list-nested">
                                {(expandedWorkspaces.has(worktree.id)
                                  ? worktreeThreads
                                  : worktreeThreads.slice(0, 3)
                                ).map((thread) => (
                                  <div
                                    key={thread.id}
                                    className={`thread-row ${worktree.id === activeWorkspaceId &&
                                      thread.id === activeThreadId
                                      ? "active"
                                      : ""
                                      }`}
                                    onClick={() =>
                                      onSelectThread(worktree.id, thread.id)
                                    }
                                    onContextMenu={(event) =>
                                      showThreadMenu(event, worktree.id, thread.id)
                                    }
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event) => {
                                      if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                      ) {
                                        event.preventDefault();
                                        onSelectThread(worktree.id, thread.id);
                                      }
                                    }}
                                  >
                                    <span
                                      className={`thread-status ${threadStatusById[thread.id]?.isReviewing
                                        ? "reviewing"
                                        : threadStatusById[thread.id]?.isProcessing
                                          ? "processing"
                                          : threadStatusById[thread.id]?.hasUnread
                                            ? "unread"
                                            : "ready"
                                        }`}
                                      aria-hidden
                                    />
                                    <span className="thread-name">{thread.name}</span>
                                    <div className="thread-menu">
                                      <button
                                        className="thread-menu-trigger"
                                        aria-label="Thread menu"
                                        onMouseDown={(event) =>
                                          event.stopPropagation()
                                        }
                                        onClick={(event) =>
                                          showThreadMenu(
                                            event,
                                            worktree.id,
                                            thread.id,
                                          )
                                        }
                                      >
                                        ...
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {worktreeThreads.length > 3 && (
                                  <button
                                    className="thread-more"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setExpandedWorkspaces((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(worktree.id)) {
                                          next.delete(worktree.id);
                                        } else {
                                          next.add(worktree.id);
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    {expandedWorkspaces.has(worktree.id)
                                      ? "Show less"
                                      : `${worktreeThreads.length - 3} more...`}
                                  </button>
                                )}
                              </div>
                            )}
                            {showWorktreeLoader && (
                              <div
                                className="thread-loading thread-loading-nested"
                                aria-label="Loading agents"
                              >
                                <span className="thread-skeleton thread-skeleton-wide" />
                                <span className="thread-skeleton" />
                                <span className="thread-skeleton thread-skeleton-short" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {showThreads && (
                  <div className="thread-list">
                    {(expandedWorkspaces.has(entry.id)
                      ? threads
                      : threads.slice(0, 3)
                    ).map((thread) => (
                      <div
                        key={thread.id}
                        className={`flex items-center gap-[6px] px-[6px] py-[4px] rounded-[6px] text-[#ffffffbf] text-[12px] cursor-pointer transition-all group/thread ${entry.id === activeWorkspaceId && thread.id === activeThreadId
                          ? "bg-[#64c8ff24] text-white"
                          : "hover:bg-white/[0.05] hover:text-white"
                          }`}
                        onClick={() => onSelectThread(entry.id, thread.id)}
                        onContextMenu={(event) =>
                          showThreadMenu(event, entry.id, thread.id)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectThread(entry.id, thread.id);
                          }
                        }}
                      >
                        <span
                          className={`w-[6px] h-[6px] rounded-full shrink-0 ml-1 ${threadStatusById[thread.id]?.isReviewing
                            ? "bg-[#2fd1c4] shadow-[0_0_8px_rgba(47,209,196,0.75)] animate-pulse"
                            : threadStatusById[thread.id]?.isProcessing
                              ? "bg-[#ff9f43] shadow-[0_0_8px_rgba(255,159,67,0.8)] animate-pulse"
                              : threadStatusById[thread.id]?.hasUnread
                                ? "bg-[#4da3ff] shadow-[0_0_8px_rgba(77,163,255,0.7)]"
                                : "bg-[#3fe47e] shadow-[0_0_8px_rgba(63,228,126,0.5)]"
                            }`}
                          aria-hidden
                        />
                        <span className="flex-1 min-w-0 truncate line-clamp-2">{thread.name}</span>
                        <div className="opacity-0 group-hover/thread:opacity-100 transition-opacity">
                          <button
                            className="text-white/45 hover:text-white text-[11px] px-1"
                            aria-label="Thread menu"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) =>
                              showThreadMenu(event, entry.id, thread.id)
                            }
                          >
                            ...
                          </button>
                        </div>
                      </div>
                    ))}
                    {threads.length > 3 && (
                      <button
                        className="thread-more"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedWorkspaces((prev) => {
                            const next = new Set(prev);
                            if (next.has(entry.id)) {
                              next.delete(entry.id);
                            } else {
                              next.add(entry.id);
                            }
                            return next;
                          });
                        }}
                      >
                        {expandedWorkspaces.has(entry.id)
                          ? "Show less"
                          : `${threads.length - 3} more...`}
                      </button>
                    )}
                  </div>
                )}
                {showThreadLoader && (
                  <div className="thread-loading" aria-label="Loading agents">
                    <span className="thread-skeleton thread-skeleton-wide" />
                    <span className="thread-skeleton" />
                    <span className="thread-skeleton thread-skeleton-short" />
                  </div>
                )}
              </div>
            );
          })}
          {!rootWorkspaces.length && (
            <div className="empty">Add a workspace to start.</div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-[10px] p-3 mx-3 my-2 rounded-[12px] border border-white/[0.04] bg-white/[0.04] text-[#ffffffbf] text-[11px]">
        <div className="flex flex-col gap-[10px] text-white/85 font-semibold">
          <div className="flex flex-col gap-[6px]">
            <div className="flex justify-between items-center tracking-tight">
              <span>{sessionLabel}</span>
              <span className="text-white/70">
                {sessionPercent === null ? "--" : `${sessionPercent}%`}
              </span>
            </div>
            <div className="relative h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-[#78ebbe/90] to-[#64c8ff/90] shadow-[0_0_10px_rgba(92,168,255,0.25)] transition-all duration-500"
                style={{ width: `${sessionPercent ?? 0}%` }}
              />
            </div>
          </div>
          {accountRateLimits?.secondary && (
            <div className="flex flex-col gap-[6px]">
              <div className="flex justify-between items-center tracking-tight">
                <span>{weeklyLabel}</span>
                <span className="text-white/70">
                  {weeklyPercent === null ? "--" : `${weeklyPercent}%`}
                </span>
              </div>
              <div className="relative h-[6px] rounded-full bg-white/[0.06] overflow-hidden">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-[#78ebbe/90] to-[#64c8ff/90] shadow-[0_0_10px_rgba(92,168,255,0.25)] transition-all duration-500"
                  style={{ width: `${weeklyPercent ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
        {creditsLabel && <div className="text-white/60">{creditsLabel}</div>}
      </div>
      <div className="sidebar-corner-actions">
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings size={14} aria-hidden />
        </button>
        {hasDebugAlerts && (
          <button
            type="button"
            onClick={onOpenDebug}
            aria-label="Open debug log"
            title="Debug log"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <TerminalSquare size={14} aria-hidden />
          </button>
        )}
      </div>
    </aside>
  );
}
