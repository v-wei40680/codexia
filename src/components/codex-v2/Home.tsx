import { ArrowRight, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/utils/codex-v2/time";

type LatestAgentRun = {
  message: string;
  timestamp: number;
  projectName: string;
  workspaceId: string;
  threadId: string;
  isProcessing: boolean;
};

type HomeProps = {
  onOpenProject: () => void;
  onAddWorkspace: () => void;
  latestAgentRuns: LatestAgentRun[];
  onSelectThread: (workspaceId: string, threadId: string) => void;
};

export function Home({
  onOpenProject,
  onAddWorkspace,
  latestAgentRuns,
  onSelectThread,
}: HomeProps) {
  const hasRuns = latestAgentRuns.length > 0;

  return (
    <div className="flex h-full w-full items-center justify-center px-6 py-8 sm:px-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Orchestrate agents across your local projects
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Codexia workspace hub
          </h1>
          <p className="max-w-xl text-sm text-white/60">
            Connect projects, start agent runs, and jump back into your latest threads
            from a single place.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <section className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Latest agents
              </span>
              {hasRuns && (
                <span className="text-[11px] text-white/35">
                  Showing up to {latestAgentRuns.length} recent runs
                </span>
              )}
            </div>

            {hasRuns ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {latestAgentRuns.map((run) => (
                  <button
                    key={run.threadId}
                    type="button"
                    onClick={() => onSelectThread(run.workspaceId, run.threadId)}
                    className="group flex flex-col gap-2 rounded-xl border border-white/8 bg-[#05060b]/80 px-4 py-3 text-left shadow-sm transition-colors hover:border-white/25 hover:bg-[#090b14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    data-tauri-drag-region="false"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[13px] font-medium text-white/90">
                        {run.projectName}
                      </div>
                      <div className="shrink-0 text-[11px] text-white/45">
                        {formatRelativeTime(run.timestamp)}
                      </div>
                    </div>
                    <div className="line-clamp-2 text-[13px] leading-snug text-white/75">
                      {run.message.trim() || "Agent replied."}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      {run.isProcessing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                          Running
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/35">Tap to reopen</span>
                      )}
                      <ArrowRight
                        aria-hidden
                        className="h-3.5 w-3.5 text-white/35 transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/12 bg-[#05060b]/60 px-4 py-5 text-sm text-white/70">
                <div className="text-sm font-medium text-white/85">
                  No agent activity yet
                </div>
                <p className="mt-1 text-[13px] text-white/55">
                  Start a thread in any project and your latest agent responses will appear
                  here for quick access.
                </p>
              </div>
            )}
          </section>

          <aside className="w-full max-w-sm lg:w-auto">
            <div className="rounded-xl border border-white/12 bg-[#05060b]/80 p-4 shadow-sm backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                Get started
              </div>
              <p className="mt-1 text-[13px] text-white/60">
                Open an existing project or add a new workspace to begin working with the
                agent.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  className="inline-flex w-full items-center justify-center gap-2 text-[13px]"
                  onClick={onOpenProject}
                  data-tauri-drag-region="false"
                >
                  <FolderOpen aria-hidden className="h-4 w-4" />
                  <span>Open project</span>
                </Button>
                <Button
                  variant="outline"
                  className="inline-flex w-full items-center justify-center gap-2 border-white/20 text-[13px]"
                  onClick={onAddWorkspace}
                  data-tauri-drag-region="false"
                >
                  <Plus aria-hidden className="h-4 w-4" />
                  <span>Add workspace</span>
                </Button>
              </div>

              <p className="mt-3 text-[11px] leading-snug text-white/40">
                Workspaces remember their threads, git status, and model settings so you
                can pick up where you left off.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
