import type { MouseEvent as ReactMouseEvent } from "react";
import type { DebugEntry } from "@/types/codex-v2";
import { Button } from "@/components/ui/button";

type DebugPanelProps = {
  entries: DebugEntry[];
  isOpen: boolean;
  onClear: () => void;
  onCopy: () => void;
  onResizeStart?: (event: ReactMouseEvent) => void;
  variant?: "dock" | "full";
};

function formatPayload(payload: unknown) {
  if (payload === undefined) {
    return "";
  }
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function DebugPanel({
  entries,
  isOpen,
  onClear,
  onCopy,
  onResizeStart,
  variant = "dock",
}: DebugPanelProps) {
  const isVisible = variant === "full" || isOpen;
  if (!isVisible) {
    return null;
  }

  const heightStyle: React.CSSProperties | undefined =
    variant !== "full" && isOpen ? { height: "var(--debug-panel-height, 180px)" } : undefined;

  return (
    <section
      className="flex flex-col border-t border-border/60 bg-background/40 backdrop-blur"
      style={heightStyle}
    >
      {variant !== "full" && isOpen && onResizeStart && (
        <div
          className="h-1.5 shrink-0 cursor-row-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize debug panel"
          onMouseDown={onResizeStart}
        />
      )}
      <div className="flex items-center justify-between px-5 py-1.5 text-[12px]">
        <div className="text-[12px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
          Debug
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
            Copy
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
      {isOpen && (
        <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto px-4 pt-2 pb-3">
          {entries.length === 0 && (
            <div className="text-[12px] text-muted-foreground">
              No debug events yet.
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                <span
                  className={[
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase",
                    entry.source === "error"
                      ? "bg-destructive/15 text-destructive"
                      : entry.source === "stderr"
                        ? "bg-amber-500/15 text-amber-300"
                        : "bg-muted/40 text-muted-foreground",
                  ].join(" ")}
                >
                  {entry.source}
                </span>
                <span className="tabular-nums">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-semibold text-foreground/80">
                  {entry.label}
                </span>
              </div>
              {entry.payload !== undefined && (
                <pre className="m-0 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-foreground/90">
                  {formatPayload(entry.payload)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
