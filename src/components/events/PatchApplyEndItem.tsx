import { memo } from "react";
import type { CodexEvent } from "@/types/chat";
import { EventBubble } from "./EventBubble";
import { Badge } from "@/components/ui/badge";

export const PatchApplyEndItem = memo(function PatchApplyEndItem({
  event,
}: {
  event: CodexEvent;
}) {
  const { msg } = event.payload.params;

  if (msg.type !== "patch_apply_end") {
    return null;
  }

  const stdout = msg.stdout.trim();
  const stderr = msg.stderr.trim();
  const showStdout = stdout.length > 0;
  const showStderr = stderr.length > 0;

  return (
    <EventBubble align="start" variant="system" title="Patch result">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={msg.success ? "default" : "destructive"}>
            {msg.success ? "Applied" : "Failed"}
          </Badge>
        </div>
        {showStdout && (
          <div>
            <p className="mb-1 text-xs font-medium text-foreground/80">
              Stdout
            </p>
            <pre className="max-h-48 overflow-auto rounded bg-background/80 p-2 text-xs">
              {stdout}
            </pre>
          </div>
        )}
        {showStderr && (
          <div>
            <p className="mb-1 text-xs font-medium text-foreground/80">
              Stderr
            </p>
            <pre className="max-h-48 overflow-auto rounded bg-destructive/15 p-2 text-xs text-destructive">
              {stderr}
            </pre>
          </div>
        )}
        {!showStdout && !showStderr && (
          <p className="text-xs text-muted-foreground">
            No additional output was captured.
          </p>
        )}
      </div>
    </EventBubble>
  );
});
