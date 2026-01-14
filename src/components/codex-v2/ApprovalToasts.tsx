import type { ApprovalRequest, WorkspaceInfo } from "@/types/codex-v2";
import { Button } from "@/components/ui/button";

type ApprovalToastsProps = {
  approvals: ApprovalRequest[];
  workspaces: WorkspaceInfo[];
  onDecision: (request: ApprovalRequest, decision: "accept" | "decline") => void;
};

export function ApprovalToasts({
  approvals,
  workspaces,
  onDecision,
}: ApprovalToastsProps) {
  if (!approvals.length) {
    return null;
  }

  const workspaceLabels = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.name]),
  );

  return (
    <div
      className="pointer-events-none absolute top-9 right-5 z-50 grid w-[min(380px,calc(100vw-40px))] gap-3 md:top-auto md:bottom-24 md:right-1/2 md:translate-x-1/2"
      role="region"
      aria-live="assertive"
    >
      {approvals.map((request) => {
        const workspaceName = workspaceLabels.get(request.workspace_id);
        return (
          <div
            key={request.request_id}
            className="pointer-events-auto max-w-full rounded-xl border border-border/60 bg-background/95 p-3 shadow-2xl backdrop-blur"
            role="alert"
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className="text-[12px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                Approval needed
              </div>
              {workspaceName ? (
                <div className="text-[12px] text-muted-foreground/80">
                  {workspaceName}
                </div>
              ) : null}
            </div>
            <div className="mb-2 break-words text-[12px] font-semibold">
              {request.method}
            </div>
            <div className="mb-2.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
              {JSON.stringify(request.params, null, 2)}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onDecision(request, "decline")}
              >
                Decline
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onDecision(request, "accept")}
              >
                Approve
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
