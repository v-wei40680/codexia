import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { CodexEvent } from "@/types/chat";
import { EventBubble } from "./EventBubble";
import { describeFileChange } from "./helpers";

export const PatchApplyBeginItem = memo(function PatchApplyBeginItem({
  event,
}: {
  event: CodexEvent;
}) {
  const { msg } = event.payload.params;

  if (msg.type !== "patch_apply_begin") {
    return null;
  }

  const entries = Object.entries(msg.changes ?? {});
  return (
    <EventBubble align="start" variant="system" title="Applying Patch">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={msg.auto_approved ? "secondary" : "outline"}>
            {msg.auto_approved ? "Auto-approved" : "Pending approval"}
          </Badge>
        </div>
        <div className="space-y-2">
          {entries.length > 0 ? (
            entries.map(([path, change]) => {
              if (!change) return null;
              const { label, detail } = describeFileChange(change);
              return (
                <div
                  key={path}
                  className="space-y-1 rounded border border-border/60 bg-muted/30 p-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{label}</Badge>
                    <span className="font-mono text-xs">{path}</span>
                  </div>
                  {detail && (
                    <div className="text-xs text-muted-foreground">
                      {detail}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-xs text-muted-foreground">
              No file changes were included in this patch.
            </div>
          )}
        </div>
      </div>
    </EventBubble>
  );
});
