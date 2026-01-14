import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, FolderOpen, GitBranch, Terminal } from "lucide-react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { BranchInfo, WorkspaceInfo } from "@/types/codex-v2";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type MainHeaderProps = {
  workspace: WorkspaceInfo;
  parentName?: string | null;
  worktreeLabel?: string | null;
  disableBranchMenu?: boolean;
  parentPath?: string | null;
  worktreePath?: string | null;
  branchName: string;
  branches: BranchInfo[];
  onCheckoutBranch: (name: string) => Promise<void> | void;
  onCreateBranch: (name: string) => Promise<void> | void;
};

export function MainHeader({
  workspace,
  parentName = null,
  worktreeLabel = null,
  disableBranchMenu = false,
  parentPath = null,
  worktreePath = null,
  branchName,
  branches,
  onCheckoutBranch,
  onCreateBranch,
}: MainHeaderProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBranch, setNewBranch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);

  const recentBranches = branches.slice(0, 12);
  const resolvedWorktreePath = worktreePath ?? workspace.path;
  const relativeWorktreePath =
    parentPath && resolvedWorktreePath.startsWith(`${parentPath}/`)
      ? resolvedWorktreePath.slice(parentPath.length + 1)
      : resolvedWorktreePath;
  const cdCommand = `cd "${relativeWorktreePath}"`;

  useEffect(() => {
    if (!infoOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const infoContains = infoRef.current?.contains(target) ?? false;
      if (!infoContains) {
        setInfoOpen(false);
        setIsCreating(false);
        setNewBranch("");
        setError(null);
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("mousedown", handleClick);
    };
  }, [infoOpen]);

  return (
    <header
      className="flex min-w-0 items-center justify-between gap-3 text-sm text-white"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-white/90">
          {parentName ? parentName : workspace.name}
        </span>
        <span className="text-white/35" aria-hidden>
          ›
        </span>
        {disableBranchMenu ? (
          <div className="relative flex min-w-0 items-center" ref={infoRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 shadow-sm transition-colors hover:border-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              onClick={() => setInfoOpen((prev) => !prev)}
              aria-haspopup="dialog"
              aria-expanded={infoOpen}
              
              title="Worktree info"
            >
              <GitBranch aria-hidden className="h-3.5 w-3.5 text-emerald-300/90" />
              <span className="truncate">{worktreeLabel || branchName}</span>
              <ChevronDown aria-hidden className="h-3 w-3 text-white/45" />
            </button>
            {infoOpen && (
              <div
                className="absolute left-0 top-8 z-30 w-80 rounded-xl border border-white/15 bg-[#05060b]/95 p-4 text-xs text-white/85 shadow-xl backdrop-blur-md"
                role="dialog"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Worktree
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-white/65">
                      <Terminal aria-hidden className="h-3.5 w-3.5 text-white/55" />
                      <span>
                        Terminal
                        {parentPath ? " (repo root)" : ""}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <code className="max-w-[160px] truncate rounded-md bg-black/60 px-2 py-1 text-[11px] font-mono text-white/80">
                        {cdCommand}
                      </code>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        onClick={async () => {
                          await navigator.clipboard.writeText(cdCommand);
                        }}
                        aria-label="Copy command"
                        title="Copy command"
                      >
                        <Copy aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/50">
                    Use this command to open the worktree in your terminal.
                  </p>
                </div>
                <div className="mt-3 space-y-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/65">
                    <FolderOpen aria-hidden className="h-3.5 w-3.5 text-white/55" />
                    <span>Reveal</span>
                  </span>
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-white/18 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/90 transition-colors hover:border-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    onClick={async () => {
                      await revealItemInDir(resolvedWorktreePath);
                    }}
                    
                  >
                    <span>Reveal in Finder</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/18 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 shadow-sm transition-colors hover:border-white/35 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <GitBranch aria-hidden className="h-3.5 w-3.5 text-emerald-300/90" />
                <span className="truncate">{branchName}</span>
                <ChevronDown aria-hidden className="h-3 w-3 text-white/45" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="w-64 bg-[#05060b]/95 text-xs text-white/85 backdrop-blur-md"
            >
              {!isCreating && (
                <DropdownMenuItem
                  onSelect={() => setIsCreating(true)}
                  className="gap-1.5 text-[11px]"
                >
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[13px] text-emerald-300">
                    +
                  </span>
                  <span>Create branch</span>
                </DropdownMenuItem>
              )}

              {isCreating && (
                <div className="px-2 py-1.5">
                  <input
                    value={newBranch}
                    onChange={(event) => setNewBranch(event.target.value)}
                    placeholder="new-branch-name"
                    className="h-7 w-full rounded-md border border-white/20 bg-black/40 px-2 text-[11px] text-white/90 placeholder:text-white/35 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/70"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="mt-1 w-full rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90"
                    onClick={async () => {
                      const name = newBranch.trim();
                      if (!name) return;
                      try {
                        await onCreateBranch(name);
                        setIsCreating(false);
                        setNewBranch("");
                        setError(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : String(err));
                      }
                    }}
                  >
                    Create & checkout
                  </button>
                </div>
              )}

              <DropdownMenuSeparator />

              {recentBranches.map((branch) => (
                <DropdownMenuItem
                  key={branch.name}
                  disabled={branch.name === branchName}
                  onSelect={async () => {
                    if (branch.name === branchName) return;
                    try {
                      await onCheckoutBranch(branch.name);
                      setIsCreating(false);
                      setNewBranch("");
                      setError(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="text-[11px]"
                >
                  <span className="truncate">{branch.name}</span>
                  {branch.name === branchName && (
                    <span className="ml-auto text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                      Current
                    </span>
                  )}
                </DropdownMenuItem>
              ))}

              {recentBranches.length === 0 && (
                <div className="px-2 py-2 text-[11px] text-white/50">
                  No branches found
                </div>
              )}

              {error && (
                <div className="mt-2 rounded-md border border-destructive/40 bg-destructive/15 px-2.5 py-1.5 text-[11px] text-destructive">
                  {error}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
