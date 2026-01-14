import { useCallback } from "react";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Menu, MenuItem } from "@tauri-apps/api/menu";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { QueuedMessage } from "@/types/codex-v2";
import { Button } from "@/components/ui/button";

type ComposerQueueProps = {
  queuedMessages: QueuedMessage[];
  onEditQueued?: (item: QueuedMessage) => void;
  onDeleteQueued?: (id: string) => void;
};

export function ComposerQueue({
  queuedMessages,
  onEditQueued,
  onDeleteQueued,
}: ComposerQueueProps) {
  const handleQueueMenu = useCallback(
    async (event: React.MouseEvent, item: QueuedMessage) => {
      event.preventDefault();
      event.stopPropagation();
      const { clientX, clientY } = event;
      const editItem = await MenuItem.new({
        text: "Edit",
        action: () => onEditQueued?.(item),
      });
      const deleteItem = await MenuItem.new({
        text: "Delete",
        action: () => onDeleteQueued?.(item.id),
      });
      const menu = await Menu.new({ items: [editItem, deleteItem] });
      const window = getCurrentWindow();
      const position = new LogicalPosition(clientX, clientY);
      await menu.popup(position, window);
    },
    [onDeleteQueued, onEditQueued],
  );

  if (queuedMessages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border border-border/70 bg-card px-2 py-1.5">
      <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground/80">
        Queued
      </div>
      <div className="flex flex-col gap-1">
        {queuedMessages.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg bg-muted/30 px-1.5 py-1 text-[11px] text-muted-foreground"
          >
            <span className="min-w-0 flex-1 truncate text-foreground/80">
              {item.text}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={(event) => handleQueueMenu(event, item)}
              aria-label="Queue item menu"
            >
              <span aria-hidden>…</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
