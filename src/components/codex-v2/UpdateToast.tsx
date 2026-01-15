import type { UpdateState } from "@/hooks/codex/v2/useUpdaterV2";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type UpdateToastProps = {
  state: UpdateState;
  onUpdate: () => void;
  onDismiss: () => void;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function UpdateToast({ state, onUpdate, onDismiss }: UpdateToastProps) {
  if (state.stage === "idle") {
    return null;
  }

  const totalBytes = state.progress?.totalBytes;
  const downloadedBytes = state.progress?.downloadedBytes ?? 0;
  const percent =
    totalBytes && totalBytes > 0
      ? Math.min(100, (downloadedBytes / totalBytes) * 100)
      : null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] w-full max-w-sm rounded-xl border bg-background p-4 shadow-xl"
      role="region"
      aria-live="polite"
    >
      <div role="status" className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium leading-none">Update available</div>
          {state.version ? (
            <div className="text-xs text-muted-foreground">v{state.version}</div>
          ) : null}
        </div>

        {state.stage === "checking" && (
          <div className="text-sm text-muted-foreground">Checking for updates...</div>
        )}

        {state.stage === "available" && (
          <>
            <div className="text-sm">A new version is available.</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={onDismiss}>
                Later
              </Button>
              <Button size="sm" onClick={onUpdate}>
                Update
              </Button>
            </div>
          </>
        )}

        {state.stage === "downloading" && (
          <>
            <div className="text-sm">Downloading update…</div>
            <div className="space-y-1">
              <Progress value={percent ?? 24} />
              <div className="text-xs text-muted-foreground">
                {totalBytes
                  ? `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}`
                  : `${formatBytes(downloadedBytes)} downloaded`}
              </div>
            </div>
          </>
        )}

        {state.stage === "installing" && (
          <div className="text-sm">Installing update…</div>
        )}

        {state.stage === "restarting" && (
          <div className="text-sm">Restarting…</div>
        )}

        {state.stage === "error" && (
          <>
            <div className="text-sm text-destructive">Update failed.</div>
            {state.error ? (
              <div className="text-xs text-muted-foreground">{state.error}</div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={onDismiss}>
                Dismiss
              </Button>
              <Button size="sm" onClick={onUpdate}>
                Retry
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
