import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import type { CodexEvent } from "@/types/chat";
import { renderFileChanges } from "./PatchItem";
import type { FileChange } from "@/bindings/FileChange";

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
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={msg.auto_approved ? "secondary" : "outline"}>
            {msg.auto_approved ? "Auto-approved" : "Pending approval"}
          </Badge>
        </div>
        <div className="space-y-2">
          {entries.length > 0 ? (
            renderFileChanges(Object.fromEntries(entries.filter(([, change]) => change !== undefined)) as { [key: string]: FileChange })
          ) : (
            <div className="text-xs text-muted-foreground">
              No file changes were included in this patch.
            </div>
          )}
        </div>
      </div>
  );
});
