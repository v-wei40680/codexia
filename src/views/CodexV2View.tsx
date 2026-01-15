import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/codex-v2/Sidebar";
import { WorktreePrompt } from "@/components/codex-v2/WorktreePrompt";
import { Home } from "@/components/codex-v2/Home";
import { MainHeader } from "@/components/codex-v2/MainHeader";
import { Messages } from "@/components/codex-v2/Messages";
import { ApprovalToasts } from "@/components/codex-v2/ApprovalToasts";
import { Composer } from "@/components/codex-v2/Composer";
import { GitDiffPanel } from "@/components/codex-v2/GitDiffPanel";
import { GitDiffViewer } from "@/components/codex-v2/GitDiffViewer";
import { DebugPanel } from "@/components/codex-v2/DebugPanel";
import { PlanPanel } from "@/components/codex-v2/PlanPanel";
import { TabBar } from "@/components/codex-v2/TabBar";
import { TabletNav } from "@/components/codex-v2/TabletNav";
import { SettingsView } from "@/components/codex-v2/SettingsView";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspacesV2 } from "@/hooks/codex/v2/useWorkspacesV2";
import { useThreadsV2 } from "@/hooks/codex/v2/useThreadsV2";
import { useGitStatusV2 } from "@/hooks/codex/v2/useGitStatusV2";
import { useGitDiffsV2 } from "@/hooks/codex/v2/useGitDiffsV2";
import { useGitLogV2 } from "@/hooks/codex/v2/useGitLogV2";
import { useGitHubIssuesV2 } from "@/hooks/codex/v2/useGitHubIssuesV2";
import { useGitRemoteV2 } from "@/hooks/codex/v2/useGitRemoteV2";
import { useModelsV2 } from "@/hooks/codex/v2/useModelsV2";
import { useSkillsV2 } from "@/hooks/codex/v2/useSkillsV2";
import { useWorkspaceFilesV2 } from "@/hooks/codex/v2/useWorkspaceFilesV2";
import { useGitBranchesV2 } from "@/hooks/codex/v2/useGitBranchesV2";
import { useDebugLogV2 } from "@/hooks/codex/v2/useDebugLogV2";
import { useWorkspaceRefreshOnFocusV2 } from "@/hooks/codex/v2/useWorkspaceRefreshOnFocusV2";
import { useWorkspaceRestoreV2 } from "@/hooks/codex/v2/useWorkspaceRestoreV2";
import { useResizablePanelsV2 } from "@/hooks/codex/v2/useResizablePanelsV2";
import { useLayoutModeV2 } from "@/hooks/codex/v2/useLayoutModeV2";
import { useAppSettingsV2 } from "@/hooks/codex/v2/useAppSettingsV2";
import type {
  AccessMode,
  DiffLineReference,
  QueuedMessage,
  WorkspaceInfo,
} from "@/types/codex-v2";

function CodexV2ViewMain() {
  const {
    sidebarWidth,
    rightPanelWidth,
    onSidebarResizeStart,
    onRightPanelResizeStart,
    planPanelHeight,
    onPlanPanelResizeStart,
    debugPanelHeight,
    onDebugPanelResizeStart,
  } = useResizablePanelsV2();
  const layoutMode = useLayoutModeV2();
  const isCompact = layoutMode !== "desktop";
  const isTablet = layoutMode === "tablet";
  const isPhone = layoutMode === "phone";
  const [centerMode, setCenterMode] = useState<"chat" | "diff">("chat");
  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null);
  const [gitPanelMode, setGitPanelMode] = useState<
    "diff" | "log" | "issues"
  >("diff");
  const [accessMode, setAccessMode] = useState<AccessMode>("current");
  const [activeTab, setActiveTab] = useState<
    "projects" | "codex" | "git" | "log"
  >("codex");
  const tabletTab = activeTab === "projects" ? "codex" : activeTab;
  const [queuedByThread, setQueuedByThread] = useState<
    Record<string, QueuedMessage[]>
  >({});
  const [prefillDraft, setPrefillDraft] = useState<QueuedMessage | null>(null);
  const [composerInsert, setComposerInsert] = useState<QueuedMessage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [flushingByThread, setFlushingByThread] = useState<Record<string, boolean>>(
    {},
  );
  const [worktreePrompt, setWorktreePrompt] = useState<{
    workspace: WorkspaceInfo;
    branch: string;
    isSubmitting: boolean;
    error: string | null;
  } | null>(null);
  const {
    debugOpen,
    setDebugOpen,
    debugEntries,
    hasDebugAlerts,
    addDebugEntry,
    handleCopyDebug,
    clearDebugEntries,
  } = useDebugLogV2();


  const { settings: appSettings, saveSettings } = useAppSettingsV2();

  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    addWorkspace,
    addWorktreeAgent,
    connectWorkspace,
    markWorkspaceConnected,
    updateWorkspaceSettings,
    removeWorkspace,
    removeWorktree,
    hasLoaded,
    refreshWorkspaces,
  } = useWorkspacesV2({ onDebug: addDebugEntry });

  useEffect(() => {
    setAccessMode((prev) =>
      prev === "current" ? appSettings.defaultAccessMode : prev,
    );
  }, [appSettings.defaultAccessMode]);



  const { status: gitStatus, refresh: refreshGitStatus } =
    useGitStatusV2(activeWorkspace);
  const compactTab = isTablet ? tabletTab : activeTab;
  const shouldLoadDiffs =
    centerMode === "diff" || (isCompact && compactTab === "git");
  const shouldLoadGitLog = Boolean(activeWorkspace);
  const {
    diffs: gitDiffs,
    isLoading: isDiffLoading,
    error: diffError,
  } = useGitDiffsV2(activeWorkspace, gitStatus.files, shouldLoadDiffs);
  const {
    entries: gitLogEntries,
    total: gitLogTotal,
    ahead: gitLogAhead,
    behind: gitLogBehind,
    aheadEntries: gitLogAheadEntries,
    behindEntries: gitLogBehindEntries,
    upstream: gitLogUpstream,
    isLoading: gitLogLoading,
    error: gitLogError,
  } = useGitLogV2(activeWorkspace, shouldLoadGitLog);
  const {
    issues: gitIssues,
    total: gitIssuesTotal,
    isLoading: gitIssuesLoading,
    error: gitIssuesError,
  } = useGitHubIssuesV2(activeWorkspace, gitPanelMode === "issues");
  const { remote: gitRemoteUrl } = useGitRemoteV2(activeWorkspace);
  const {
    models,
    selectedModel,
    selectedModelId,
    setSelectedModelId,
    reasoningOptions,
    selectedEffort,
    setSelectedEffort,
  } = useModelsV2({ activeWorkspace, onDebug: addDebugEntry });
  const { skills } = useSkillsV2({ activeWorkspace, onDebug: addDebugEntry });
  const { files } = useWorkspaceFilesV2({ activeWorkspace, onDebug: addDebugEntry });
  const {
    branches,
    checkoutBranch,
    createBranch,
  } = useGitBranchesV2({ activeWorkspace, onDebug: addDebugEntry });
  const handleCheckoutBranch = async (name: string) => {
    await checkoutBranch(name);
    refreshGitStatus();
  };
  const handleCreateBranch = async (name: string) => {
    await createBranch(name);
    refreshGitStatus();
  };

  const resolvedModel = selectedModel?.model ?? null;
  const fileStatus =
    gitStatus.files.length > 0
      ? `${gitStatus.files.length} file${gitStatus.files.length === 1 ? "" : "s"} changed`
      : "Working tree clean";

  const {
    setActiveThreadId,
    activeThreadId,
    activeItems,
    approvals,
    threadsByWorkspace,
    threadStatusById,
    threadListLoadingByWorkspace,
    activeTurnIdByThread,
    tokenUsageByThread,
    rateLimitsByWorkspace,
    planByThread,
    lastAgentMessageByThread,
    interruptTurn,
    removeThread,
    startThreadForWorkspace,
    listThreadsForWorkspace,
    sendUserMessage,
    startReview,
    handleApprovalDecision,
  } = useThreadsV2({
    activeWorkspace,
    onWorkspaceConnected: markWorkspaceConnected,
    onDebug: addDebugEntry,
    model: resolvedModel,
    effort: selectedEffort,
    accessMode,
    onMessageActivity: refreshGitStatus,
  });

  const latestAgentRuns = useMemo(() => {
    const entries: Array<{
      threadId: string;
      message: string;
      timestamp: number;
      projectName: string;
      workspaceId: string;
      isProcessing: boolean;
    }> = [];
    workspaces.forEach((workspace) => {
      const threads = threadsByWorkspace[workspace.id] ?? [];
      threads.forEach((thread) => {
        const entry = lastAgentMessageByThread[thread.id];
        if (!entry) {
          return;
        }
        entries.push({
          threadId: thread.id,
          message: entry.text,
          timestamp: entry.timestamp,
          projectName: workspace.name,
          workspaceId: workspace.id,
          isProcessing: threadStatusById[thread.id]?.isProcessing ?? false,
        });
      });
    });
    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
  }, [
    lastAgentMessageByThread,
    threadStatusById,
    threadsByWorkspace,
    workspaces,
  ]);

  const activeRateLimits = activeWorkspaceId
    ? rateLimitsByWorkspace[activeWorkspaceId] ?? null
    : null;
  const activeTokenUsage = activeThreadId
    ? tokenUsageByThread[activeThreadId] ?? null
    : null;
  const activePlan = activeThreadId ? planByThread[activeThreadId] ?? null : null;
  const showHome = !activeWorkspace;
  const canInterrupt = activeThreadId
    ? Boolean(
      threadStatusById[activeThreadId]?.isProcessing &&
      activeTurnIdByThread[activeThreadId],
    )
    : false;
  const isProcessing = activeThreadId
    ? threadStatusById[activeThreadId]?.isProcessing ?? false
    : false;
  const isReviewing = activeThreadId
    ? threadStatusById[activeThreadId]?.isReviewing ?? false
    : false;
  const activeQueue = activeThreadId
    ? queuedByThread[activeThreadId] ?? []
    : [];
  const isWorktreeWorkspace = activeWorkspace?.kind === "worktree";
  const activeParentWorkspace = isWorktreeWorkspace
    ? workspaces.find((entry) => entry.id === activeWorkspace?.parentId) ?? null
    : null;
  const worktreeLabel = isWorktreeWorkspace
    ? activeWorkspace?.worktree?.branch ?? activeWorkspace?.name ?? null
    : null;

  useEffect(() => {
    if (!isPhone) {
      return;
    }
    if (!activeWorkspace && activeTab !== "projects") {
      setActiveTab("projects");
    }
  }, [activeTab, activeWorkspace, isPhone]);

  useEffect(() => {
    if (!isTablet) {
      return;
    }
    if (activeTab === "projects") {
      setActiveTab("codex");
    }
  }, [activeTab, isTablet]);

  useWorkspaceRestoreV2({
    workspaces,
    hasLoaded,
    connectWorkspace,
    listThreadsForWorkspace,
  });
  useWorkspaceRefreshOnFocusV2({
    workspaces,
    refreshWorkspaces,
    listThreadsForWorkspace,
  });

  async function handleAddWorkspace() {
    try {
      const workspace = await addWorkspace();
      if (workspace) {
        setActiveThreadId(null, workspace.id);
        if (isCompact) {
          setActiveTab("codex");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addDebugEntry({
        id: `${Date.now()}-client-add-workspace-error`,
        timestamp: Date.now(),
        source: "error",
        label: "workspace/add error",
        payload: message,
      });
      alert(`Failed to add workspace.\n\n${message}`);
    }
  }

  function selectWorkspace(workspaceId: string) {
    const target = workspaces.find((entry) => entry.id === workspaceId);
    if (target?.settings.sidebarCollapsed) {
      void updateWorkspaceSettings(workspaceId, {
        ...target.settings,
        sidebarCollapsed: false,
      });
    }
    setActiveWorkspaceId(workspaceId);
    if (isCompact) {
      setActiveTab("codex");
    }
  }

  function exitDiffView() {
    setCenterMode("chat");
    setSelectedDiffPath(null);
  }

  async function handleAddAgent(workspace: (typeof workspaces)[number]) {
    exitDiffView();
    selectWorkspace(workspace.id);
    if (!workspace.connected) {
      await connectWorkspace(workspace);
    }
    await startThreadForWorkspace(workspace.id);
    if (isCompact) {
      setActiveTab("codex");
    }
  }

  async function handleAddWorktreeAgent(workspace: (typeof workspaces)[number]) {
    exitDiffView();
    const defaultBranch = `codex/${new Date().toISOString().slice(0, 10)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    setWorktreePrompt({
      workspace,
      branch: defaultBranch,
      isSubmitting: false,
      error: null,
    });
  }

  async function handleConfirmWorktreePrompt() {
    if (!worktreePrompt || worktreePrompt.isSubmitting) {
      return;
    }
    const { workspace, branch } = worktreePrompt;
    setWorktreePrompt((prev) =>
      prev ? { ...prev, isSubmitting: true, error: null } : prev,
    );
    try {
      const worktreeWorkspace = await addWorktreeAgent(workspace, branch);
      if (!worktreeWorkspace) {
        setWorktreePrompt(null);
        return;
      }
      selectWorkspace(worktreeWorkspace.id);
      if (!worktreeWorkspace.connected) {
        await connectWorkspace(worktreeWorkspace);
      }
      if (isCompact) {
        setActiveTab("codex");
      }
      setWorktreePrompt(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWorktreePrompt((prev) =>
        prev ? { ...prev, isSubmitting: false, error: message } : prev,
      );
      addDebugEntry({
        id: `${Date.now()}-client-add-worktree-error`,
        timestamp: Date.now(),
        source: "error",
        label: "worktree/add error",
        payload: message,
      });
    }
  }

  function handleSelectDiff(path: string) {
    setSelectedDiffPath(path);
    setCenterMode("diff");
    setGitPanelMode("diff");
    if (isCompact) {
      setActiveTab("git");
    }
  }

  function handleActiveDiffPath(path: string) {
    if (path !== selectedDiffPath) {
      setSelectedDiffPath(path);
    }
  }

  function handleDiffLineReference(reference: DiffLineReference) {
    const startLine = reference.newLine ?? reference.oldLine;
    const endLine =
      reference.endNewLine ?? reference.endOldLine ?? startLine ?? null;
    const lineRange =
      startLine && endLine && endLine !== startLine
        ? `${startLine}-${endLine}`
        : startLine
          ? `${startLine}`
          : null;
    const lineLabel = lineRange ? `${reference.path}:${lineRange}` : reference.path;
    const changeLabel =
      reference.type === "add"
        ? "added"
        : reference.type === "del"
          ? "removed"
          : reference.type === "mixed"
            ? "mixed"
            : "context";
    const snippet = reference.lines.join("\n").trimEnd();
    const snippetBlock = snippet ? `\n\`\`\`\n${snippet}\n\`\`\`` : "";
    const label = reference.lines.length > 1 ? "Line range" : "Line reference";
    const text = `${label} (${changeLabel}): ${lineLabel}${snippetBlock}`;
    setComposerInsert({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      createdAt: Date.now(),
    });
  }

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    if (activeThreadId && threadStatusById[activeThreadId]?.isReviewing) {
      return;
    }
    if (isProcessing && activeThreadId) {
      const item: QueuedMessage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: trimmed,
        createdAt: Date.now(),
      };
      setQueuedByThread((prev) => ({
        ...prev,
        [activeThreadId]: [...(prev[activeThreadId] ?? []), item],
      }));
      return;
    }
    if (activeWorkspace && !activeWorkspace.connected) {
      await connectWorkspace(activeWorkspace);
    }
    if (trimmed.startsWith("/review")) {
      await startReview(trimmed);
      return;
    }
    await sendUserMessage(trimmed);
  }

  useEffect(() => {
    if (!activeThreadId || isProcessing || isReviewing) {
      return;
    }
    if (flushingByThread[activeThreadId]) {
      return;
    }
    const queue = queuedByThread[activeThreadId] ?? [];
    if (queue.length === 0) {
      return;
    }
    const threadId = activeThreadId;
    const nextItem = queue[0];
    setFlushingByThread((prev) => ({ ...prev, [threadId]: true }));
    setQueuedByThread((prev) => ({
      ...prev,
      [threadId]: (prev[threadId] ?? []).slice(1),
    }));
    (async () => {
      try {
        if (nextItem.text.trim().startsWith("/review")) {
          await startReview(nextItem.text);
        } else {
          await sendUserMessage(nextItem.text);
        }
      } catch {
        setQueuedByThread((prev) => ({
          ...prev,
          [threadId]: [nextItem, ...(prev[threadId] ?? [])],
        }));
      } finally {
        setFlushingByThread((prev) => ({ ...prev, [threadId]: false }));
      }
    })();
  }, [
    activeThreadId,
    flushingByThread,
    isProcessing,
    isReviewing,
    queuedByThread,
    sendUserMessage,
  ]);

  const handleDebugClick = () => {
    if (isCompact) {
      setActiveTab("log");
      return;
    }
    setDebugOpen((prev) => !prev);
  };
  const handleOpenSettings = () => setSettingsOpen(true);

  const orderValue = (entry: WorkspaceInfo) =>
    typeof entry.settings.sortOrder === "number"
      ? entry.settings.sortOrder
      : Number.MAX_SAFE_INTEGER;

  const handleMoveWorkspace = async (workspaceId: string, direction: "up" | "down") => {
    const ordered = workspaces
      .filter((entry) => (entry.kind ?? "main") !== "worktree")
      .slice()
      .sort((a, b) => {
        const orderDiff = orderValue(a) - orderValue(b);
        if (orderDiff !== 0) {
          return orderDiff;
        }
        return a.name.localeCompare(b.name);
      });
    const index = ordered.findIndex((entry) => entry.id === workspaceId);
    if (index === -1) {
      return;
    }
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }
    const next = ordered.slice();
    const temp = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = temp;
    await Promise.all(
      next.map((entry, idx) =>
        updateWorkspaceSettings(entry.id, {
          ...entry.settings,
          sortOrder: idx,
        }),
      ),
    );
  };

  const showComposer = !isCompact
    ? centerMode === "chat" || centerMode === "diff"
    : (isTablet ? tabletTab : activeTab) === "codex";
  const showGitDetail = Boolean(selectedDiffPath) && isPhone;
  const appClassName = `flex h-full w-full bg-[#080a10] text-[#e6e7ea] overflow-hidden font-sans selection:bg-blue-500/30 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[length:24px_24px]`;
  const topbarClass =
    "flex items-center justify-between px-6 py-2 border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-30";

  const sidebarNode = (


    <Sidebar
      workspaces={workspaces}
      threadsByWorkspace={threadsByWorkspace}
      threadStatusById={threadStatusById}
      threadListLoadingByWorkspace={threadListLoadingByWorkspace}
      activeWorkspaceId={activeWorkspaceId}
      activeThreadId={activeThreadId}
      accountRateLimits={activeRateLimits}
      onOpenSettings={handleOpenSettings}
      onOpenDebug={handleDebugClick}
      hasDebugAlerts={hasDebugAlerts}
      onAddWorkspace={handleAddWorkspace}
      onSelectHome={() => {
        exitDiffView();
        setActiveWorkspaceId(null);
        if (isCompact) {
          setActiveTab("projects");
        }
      }}
      onSelectWorkspace={(workspaceId) => {
        exitDiffView();
        selectWorkspace(workspaceId);
      }}
      onConnectWorkspace={async (workspace) => {
        await connectWorkspace(workspace);
        if (isCompact) {
          setActiveTab("codex");
        }
      }}
      onAddAgent={handleAddAgent}
      onAddWorktreeAgent={handleAddWorktreeAgent}
      onToggleWorkspaceCollapse={(workspaceId, collapsed) => {
        const target = workspaces.find((entry) => entry.id === workspaceId);
        if (!target) {
          return;
        }
        void updateWorkspaceSettings(workspaceId, {
          ...target.settings,
          sidebarCollapsed: collapsed,
        });
      }}
      onSelectThread={(workspaceId, threadId) => {
        exitDiffView();
        selectWorkspace(workspaceId);
        setActiveThreadId(threadId, workspaceId);
      }}
      onDeleteThread={(workspaceId, threadId) => {
        removeThread(workspaceId, threadId);
      }}
      onDeleteWorkspace={(workspaceId) => {
        void removeWorkspace(workspaceId);
      }}
      onDeleteWorktree={(workspaceId) => {
        void removeWorktree(workspaceId);
      }}
    />
  );

  const messagesNode = (
    <Messages
      items={activeItems}
      threadId={activeThreadId}
      isThinking={
        activeThreadId ? threadStatusById[activeThreadId]?.isProcessing ?? false : false
      }
    />
  );

  const composerNode = showComposer ? (
    <Composer
      onSend={handleSend}
      onStop={interruptTurn}
      canStop={canInterrupt}
      disabled={
        activeThreadId ? threadStatusById[activeThreadId]?.isReviewing ?? false : false
      }
      contextUsage={activeTokenUsage}
      queuedMessages={activeQueue}
      sendLabel={isProcessing ? "Queue" : "Send"}
      prefillDraft={prefillDraft}
      onPrefillHandled={(id) => {
        if (prefillDraft?.id === id) {
          setPrefillDraft(null);
        }
      }}
      insertText={composerInsert}
      onInsertHandled={(id) => {
        if (composerInsert?.id === id) {
          setComposerInsert(null);
        }
      }}
      onEditQueued={(item) => {
        if (!activeThreadId) {
          return;
        }
        setQueuedByThread((prev) => ({
          ...prev,
          [activeThreadId]: (prev[activeThreadId] ?? []).filter(
            (entry) => entry.id !== item.id,
          ),
        }));
        setPrefillDraft(item);
      }}
      onDeleteQueued={(id) => {
        if (!activeThreadId) {
          return;
        }
        setQueuedByThread((prev) => ({
          ...prev,
          [activeThreadId]: (prev[activeThreadId] ?? []).filter(
            (entry) => entry.id !== id,
          ),
        }));
      }}
      models={models}
      selectedModelId={selectedModelId}
      onSelectModel={setSelectedModelId}
      reasoningOptions={reasoningOptions}
      selectedEffort={selectedEffort}
      onSelectEffort={setSelectedEffort}
      accessMode={accessMode}
      onSelectAccessMode={setAccessMode}
      skills={skills}
      files={files}
    />
  ) : null;

  const desktopLayout = (
    <>
      <div className="flex-none h-full overflow-hidden" style={{ width: sidebarWidth }}>
        {sidebarNode}
      </div>
      <div
        className="w-1 hover:bg-primary/50 cursor-col-resize transition-colors duration-200 active:bg-primary"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onMouseDown={onSidebarResizeStart}
      />

      <section className="flex-1 flex flex-col min-w-0 h-full relative bg-[#080a10]/45">
        {showHome && (
          <Home
            onOpenProject={handleAddWorkspace}
            onAddWorkspace={handleAddWorkspace}
            latestAgentRuns={latestAgentRuns}
            onSelectThread={(workspaceId, threadId) => {
              exitDiffView();
              selectWorkspace(workspaceId);
              setActiveThreadId(threadId, workspaceId);
              if (isCompact) {
                setActiveTab("codex");
              }
            }}
          />
        )}

        {activeWorkspace && !showHome && (
          <>
            <div className={`${topbarClass} h-11 shrink-0`}>
              <div className="flex items-center gap-4 overflow-hidden">
                {centerMode === "diff" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCenterMode("chat");
                      setSelectedDiffPath(null);
                    }}
                    aria-label="Back to chat"
                  >
                    <ArrowLeft aria-hidden />
                  </Button>
                )}
                <MainHeader
                  workspace={activeWorkspace}
                  parentName={activeParentWorkspace?.name ?? null}
                  worktreeLabel={worktreeLabel}
                  disableBranchMenu={isWorktreeWorkspace}
                  parentPath={activeParentWorkspace?.path ?? null}
                  worktreePath={isWorktreeWorkspace ? activeWorkspace.path : null}
                  branchName={gitStatus.branchName || "unknown"}
                  branches={branches}
                  onCheckoutBranch={handleCheckoutBranch}
                  onCreateBranch={handleCreateBranch}
                />
              </div>
              <div className="flex items-center gap-2">
                {null}
              </div>
            </div>
            <ApprovalToasts
              approvals={approvals}
              workspaces={workspaces}
              onDecision={handleApprovalDecision}
            />
            <div className="flex-1 min-h-0 overflow-hidden relative flex">
              <div className="flex-1 min-w-0 flex flex-col h-full relative">
                <div className="flex-1 min-h-0 overflow-auto">
                  {centerMode === "diff" ? (
                    <GitDiffViewer
                      diffs={gitDiffs}
                      selectedPath={selectedDiffPath}
                      isLoading={isDiffLoading}
                      error={diffError}
                      onLineReference={handleDiffLineReference}
                      onActivePathChange={handleActiveDiffPath}
                    />
                  ) : (
                    messagesNode
                  )}
                </div>
                {composerNode}
              </div>

              <div
                className="w-px hover:w-1 hover:bg-primary/50 cursor-col-resize transition-all duration-200 active:bg-primary shrink-0 bg-border"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize right panel"
                onMouseDown={onRightPanelResizeStart}
              />
              <div
                className="flex flex-col border-l h-full bg-background/40 backdrop-blur-sm overflow-hidden shrink-0 transition-all"
                style={{ width: rightPanelWidth }}
              >
                <div className="flex-1 min-h-0 overflow-hidden">
                  <GitDiffPanel
                    mode={gitPanelMode}
                    onModeChange={setGitPanelMode}
                    branchName={gitStatus.branchName || "unknown"}
                    totalAdditions={gitStatus.totalAdditions}
                    totalDeletions={gitStatus.totalDeletions}
                    fileStatus={fileStatus}
                    error={gitStatus.error}
                    logError={gitLogError}
                    logLoading={gitLogLoading}
                    files={gitStatus.files}
                    selectedPath={selectedDiffPath}
                    onSelectFile={handleSelectDiff}
                    logEntries={gitLogEntries}
                    logTotal={gitLogTotal}
                    logAhead={gitLogAhead}
                    logBehind={gitLogBehind}
                    logAheadEntries={gitLogAheadEntries}
                    logBehindEntries={gitLogBehindEntries}
                    logUpstream={gitLogUpstream}
                    issues={gitIssues}
                    issuesTotal={gitIssuesTotal}
                    issuesLoading={gitIssuesLoading}
                    issuesError={gitIssuesError}
                    gitRemoteUrl={gitRemoteUrl}
                  />
                </div>
                <div
                  className="h-px hover:h-1 hover:bg-primary/50 cursor-row-resize transition-all duration-200 active:bg-primary shrink-0 bg-border"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize plan panel"
                  onMouseDown={onPlanPanelResizeStart}
                />
                <div className="shrink-0 overflow-hidden" style={{ height: planPanelHeight }}>
                  <PlanPanel plan={activePlan} isProcessing={isProcessing} />
                </div>
              </div>
            </div>

            <DebugPanel
              entries={debugEntries}
              isOpen={debugOpen}
              onClear={clearDebugEntries}
              onCopy={handleCopyDebug}
              onResizeStart={onDebugPanelResizeStart}
            />
          </>
        )}
      </section>
    </>
  );

  const tabletLayout = (
    <>
      <TabletNav activeTab={tabletTab} onSelect={setActiveTab} />
      <div className="min-h-0 h-full overflow-hidden border-r border-white/10">
        {sidebarNode}
      </div>
      <div
        className="absolute inset-y-0 left-[calc(var(--tablet-nav-width,72px)+var(--sidebar-width,280px)-4px)] z-30 w-2 cursor-col-resize"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize projects"
        onMouseDown={onSidebarResizeStart}
      />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ApprovalToasts
          approvals={approvals}
          workspaces={workspaces}
          onDecision={handleApprovalDecision}
        />
        {showHome && (
          <Home
            onOpenProject={handleAddWorkspace}
            onAddWorkspace={handleAddWorkspace}
            latestAgentRuns={latestAgentRuns}
            onSelectThread={(workspaceId, threadId) => {
              exitDiffView();
              selectWorkspace(workspaceId);
              setActiveThreadId(threadId, workspaceId);
              if (isCompact) {
                setActiveTab("codex");
              }
            }}
          />
        )}
        {activeWorkspace && !showHome && (
          <>
            <div className={`${topbarClass} px-5 py-2`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MainHeader
                  workspace={activeWorkspace}
                  parentName={activeParentWorkspace?.name ?? null}
                  worktreeLabel={worktreeLabel}
                  disableBranchMenu={isWorktreeWorkspace}
                  parentPath={activeParentWorkspace?.path ?? null}
                  worktreePath={isWorktreeWorkspace ? activeWorkspace.path : null}
                  branchName={gitStatus.branchName || "unknown"}
                  branches={branches}
                  onCheckoutBranch={handleCheckoutBranch}
                  onCreateBranch={handleCreateBranch}
                />
              </div>
              <div className="h-6 w-6" />
            </div>
            {tabletTab === "codex" && (
              <>
                <div className="flex-1 min-h-0">
                  {messagesNode}
                </div>
                {composerNode}
              </>
            )}
            {tabletTab === "git" && (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <GitDiffPanel
                  mode={gitPanelMode}
                  onModeChange={setGitPanelMode}
                  branchName={gitStatus.branchName || "unknown"}
                  totalAdditions={gitStatus.totalAdditions}
                  totalDeletions={gitStatus.totalDeletions}
                  fileStatus={fileStatus}
                  error={gitStatus.error}
                  logError={gitLogError}
                  logLoading={gitLogLoading}
                  files={gitStatus.files}
                  selectedPath={selectedDiffPath}
                  onSelectFile={handleSelectDiff}
                  logEntries={gitLogEntries}
                  logTotal={gitLogTotal}
                  logAhead={gitLogAhead}
                  logBehind={gitLogBehind}
                  logAheadEntries={gitLogAheadEntries}
                  logBehindEntries={gitLogBehindEntries}
                  logUpstream={gitLogUpstream}
                  issues={gitIssues}
                  issuesTotal={gitIssuesTotal}
                  issuesLoading={gitIssuesLoading}
                  issuesError={gitIssuesError}
                  gitRemoteUrl={gitRemoteUrl}
                />
                <div className="flex-1 min-h-0 overflow-hidden">
                  <GitDiffViewer
                    diffs={gitDiffs}
                    selectedPath={selectedDiffPath}
                    isLoading={isDiffLoading}
                    error={diffError}
                    onLineReference={handleDiffLineReference}
                    onActivePathChange={handleActiveDiffPath}
                  />
                </div>
              </div>
            )}
            {tabletTab === "log" && (
              <DebugPanel
                entries={debugEntries}
                isOpen
                onClear={clearDebugEntries}
                onCopy={handleCopyDebug}
                variant="full"
              />
            )}
          </>
        )}
      </section>
    </>
  );

  const phoneLayout = (
    <div className="flex h-full min-h-0 flex-col">
      <ApprovalToasts
        approvals={approvals}
        workspaces={workspaces}
        onDecision={handleApprovalDecision}
      />
      {activeTab === "projects" && (
        <div className="flex flex-1 min-h-0 flex-col">{sidebarNode}</div>
      )}
      {activeTab === "codex" && (
        <div className="flex flex-1 min-h-0 flex-col">
          {activeWorkspace ? (
            <>
              <div className={`${topbarClass} px-4 py-2`}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <MainHeader
                    workspace={activeWorkspace}
                    parentName={activeParentWorkspace?.name ?? null}
                    worktreeLabel={worktreeLabel}
                    disableBranchMenu={isWorktreeWorkspace}
                    parentPath={activeParentWorkspace?.path ?? null}
                    worktreePath={isWorktreeWorkspace ? activeWorkspace.path : null}
                    branchName={gitStatus.branchName || "unknown"}
                    branches={branches}
                    onCheckoutBranch={handleCheckoutBranch}
                    onCreateBranch={handleCreateBranch}
                  />
                </div>
                <div className="h-6 w-6" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                {messagesNode}
              </div>
              {composerNode}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <h3 className="text-base font-semibold text-foreground">No workspace selected</h3>
              <p>Choose a project to start chatting.</p>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab("projects")}>
                Go to Projects
              </Button>
            </div>
          )}
        </div>
      )}
      {activeTab === "git" && (
        <div className="flex flex-1 min-h-0 flex-col">
          {!activeWorkspace && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
              <h3 className="text-base font-semibold text-foreground">No workspace selected</h3>
              <p>Select a project to inspect diffs.</p>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab("projects")}>
                Go to Projects
              </Button>
            </div>
          )}
          {activeWorkspace && showGitDetail && (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedDiffPath(null);
                    setCenterMode("chat");
                  }}
                >
                  ‹ Back
                </Button>
                <span className="text-sm font-semibold">Diff</span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <GitDiffViewer
                  diffs={gitDiffs}
                  selectedPath={selectedDiffPath}
                  isLoading={isDiffLoading}
                  error={diffError}
                  onLineReference={handleDiffLineReference}
                  onActivePathChange={handleActiveDiffPath}
                />
              </div>
            </>
          )}
          {activeWorkspace && !showGitDetail && (
            <>
              <div className={`${topbarClass} px-4 py-2`}>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <MainHeader
                    workspace={activeWorkspace}
                    parentName={activeParentWorkspace?.name ?? null}
                    worktreeLabel={worktreeLabel}
                    disableBranchMenu={isWorktreeWorkspace}
                    parentPath={activeParentWorkspace?.path ?? null}
                    worktreePath={isWorktreeWorkspace ? activeWorkspace.path : null}
                    branchName={gitStatus.branchName || "unknown"}
                    branches={branches}
                    onCheckoutBranch={handleCheckoutBranch}
                    onCreateBranch={handleCreateBranch}
                  />
                </div>
              </div>
              <div className="flex flex-1 min-h-0 flex-col">
                <div className="min-h-0 overflow-auto">
                  <GitDiffPanel
                    mode={gitPanelMode}
                    onModeChange={setGitPanelMode}
                    branchName={gitStatus.branchName || "unknown"}
                    totalAdditions={gitStatus.totalAdditions}
                    totalDeletions={gitStatus.totalDeletions}
                    fileStatus={fileStatus}
                    error={gitStatus.error}
                    logError={gitLogError}
                    logLoading={gitLogLoading}
                    files={gitStatus.files}
                    selectedPath={selectedDiffPath}
                    onSelectFile={handleSelectDiff}
                    logEntries={gitLogEntries}
                    logTotal={gitLogTotal}
                    logAhead={gitLogAhead}
                    logBehind={gitLogBehind}
                    logAheadEntries={gitLogAheadEntries}
                    logBehindEntries={gitLogBehindEntries}
                    logUpstream={gitLogUpstream}
                    issues={gitIssues}
                    issuesTotal={gitIssuesTotal}
                    issuesLoading={gitIssuesLoading}
                    issuesError={gitIssuesError}
                    gitRemoteUrl={gitRemoteUrl}
                  />
                </div>
                {!isPhone && (
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <GitDiffViewer
                      diffs={gitDiffs}
                      selectedPath={selectedDiffPath}
                      isLoading={isDiffLoading}
                      error={diffError}
                      onLineReference={handleDiffLineReference}
                      onActivePathChange={handleActiveDiffPath}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {activeTab === "log" && (
        <div className="flex flex-1 min-h-0 flex-col">
          <DebugPanel
            entries={debugEntries}
            isOpen
            onClear={clearDebugEntries}
            onCopy={handleCopyDebug}
            variant="full"
          />
        </div>
      )}
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  );

  return (
    <div
      className={appClassName}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--right-panel-width": `${rightPanelWidth}px`,
          "--plan-panel-height": `${planPanelHeight}px`,
          "--debug-panel-height": `${debugPanelHeight}px`,
        } as React.CSSProperties
      }
    >
      <div className="drag-strip" id="titlebar" />
      {isPhone ? phoneLayout : isTablet ? tabletLayout : desktopLayout}
      {worktreePrompt && (
        <WorktreePrompt
          workspaceName={worktreePrompt.workspace.name}
          branch={worktreePrompt.branch}
          error={worktreePrompt.error}
          isBusy={worktreePrompt.isSubmitting}
          onChange={(value) =>
            setWorktreePrompt((prev) =>
              prev ? { ...prev, branch: value, error: null } : prev,
            )
          }
          onCancel={() => setWorktreePrompt(null)}
          onConfirm={handleConfirmWorktreePrompt}
        />
      )}
      {settingsOpen && (
        <SettingsView
          workspaces={workspaces}
          onClose={() => setSettingsOpen(false)}
          onMoveWorkspace={handleMoveWorkspace}
          onDeleteWorkspace={(workspaceId) => {
            void removeWorkspace(workspaceId);
          }}
          appSettings={appSettings}
          onUpdateAppSettings={async (next) => {
            await saveSettings(next);
          }}
        />
      )}
    </div>
  );
}

export default function CodexV2View() {
  return <CodexV2ViewMain />;
}
