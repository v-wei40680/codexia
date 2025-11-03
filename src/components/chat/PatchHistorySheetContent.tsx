import { Fragment } from "react";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { describeFileChange } from "@/components/events/helpers";
import type { PatchHistoryEntry } from "@/stores/usePatchHistoryStore";

interface PatchHistorySheetContentProps {
  entries: PatchHistoryEntry[];
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const getStatusVariant = (success?: boolean) => {
  if (success === undefined) return "secondary" as const;
  return success ? ("default" as const) : ("destructive" as const);
};

export function PatchHistorySheetContent({
  entries,
}: PatchHistorySheetContentProps) {
  const sortedEntries = [...entries].sort((a, b) => {
    const aTime = a.completedAt ?? a.startedAt;
    const bTime = b.completedAt ?? b.startedAt;
    return bTime - aTime;
  });

  return (
    <SheetContent side="right" className="sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>File changes</SheetTitle>
        <SheetDescription>
          Overview of recent patches applied by the agent in this conversation.
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1 px-4 pb-16">
        {sortedEntries.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            No recorded file changes yet.
          </p>
        ) : (
          <div className="space-y-4 py-2">
            {sortedEntries.map((entry) => {
              const changeEntries = Object.entries(entry.changes ?? {});
              const hasOutput =
                (entry.stdout && entry.stdout.trim().length > 0) ||
                (entry.stderr && entry.stderr.trim().length > 0);

              return (
                <div
                  key={`${entry.callId}-${entry.startedAt}`}
                  className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusVariant(entry.success)}>
                      {entry.success === undefined
                        ? "In progress"
                        : entry.success
                          ? "Applied"
                          : "Failed"}
                    </Badge>
                    {entry.autoApproved !== undefined && (
                      <Badge variant={entry.autoApproved ? "secondary" : "outline"}>
                        {entry.autoApproved ? "Auto-approved" : "Awaited approval"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {dateFormatter.format(entry.completedAt ?? entry.startedAt)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {changeEntries.length > 0 ? (
                      changeEntries.map(([path, change]) => {
                        if (!change) return null;
                        const { label, detail } = describeFileChange(change);
                        return (
                          <Fragment key={`${entry.callId}-${path}`}>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant="outline">{label}</Badge>
                              <span className="font-mono">{path}</span>
                              {detail && (
                                <span className="text-muted-foreground">
                                  {detail}
                                </span>
                              )}
                            </div>
                          </Fragment>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No file changes were reported for this patch.
                      </p>
                    )}
                  </div>

                  {hasOutput && (
                    <div className="space-y-2 text-xs">
                      {entry.stdout && entry.stdout.trim().length > 0 && (
                        <div>
                          <p className="font-medium text-foreground/80">Stdout</p>
                          <pre className="mt-1 max-h-40 overflow-auto rounded bg-background/80 p-2">
                            {entry.stdout.trim()}
                          </pre>
                        </div>
                      )}
                      {entry.stderr && entry.stderr.trim().length > 0 && (
                        <div>
                          <p className="font-medium text-foreground/80">Stderr</p>
                          <pre className="mt-1 max-h-40 overflow-auto rounded bg-destructive/10 p-2 text-destructive">
                            {entry.stderr.trim()}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </SheetContent>
  );
}
