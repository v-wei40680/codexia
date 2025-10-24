import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type EventVariant = "user" | "assistant" | "system";

const VARIANT_CLASSES: Record<EventVariant, string> = {
  user: "bg-primary text-primary-foreground",
  assistant: "bg-muted text-foreground",
  system: "bg-background text-foreground border border-border",
};

const TITLE_CLASSES: Record<EventVariant, string> = {
  user: "text-primary-foreground/80",
  assistant: "text-muted-foreground",
  system: "text-muted-foreground",
};

export function EventBubble({
  align,
  variant,
  title,
  children,
}: {
  align: "start" | "end";
  variant: EventVariant;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-xl rounded-lg px-4 py-3 text-sm shadow-sm",
          VARIANT_CLASSES[variant],
        )}
      >
        {title ? (
          <div
            className={cn(
              "mb-2 text-xs font-semibold tracking-wide",
              TITLE_CLASSES[variant],
            )}
          >
            {title}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
