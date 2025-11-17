import { Button } from "@/components/ui/button";
import { Check, Copy, Undo2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MsgFooterProps {
  content: string;
  align: "start" | "end";
  metaInfo?: string | null;
  onUndo?: () => void;
  canUndo?: boolean;
}

export function MsgFooter({
  content,
  align,
  metaInfo,
  onUndo,
  canUndo,
}: MsgFooterProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn("flex items-center gap-2", {
        "justify-end": align === "end",
        "justify-start": align === "start",
      })}
    >
      {metaInfo && (
        <span className="text-xs text-muted-foreground">{metaInfo}</span>
      )}
      {onUndo && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-secondary dark:hover:bg-white/10 transition-colors"
          onClick={onUndo}
          disabled={canUndo === false}
        >
          <Undo2 size={6} />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 hover:bg-secondary dark:hover:bg-white/10 transition-colors"
        onClick={handleCopy}
      >
        {copied ? <Check size={6} /> : <Copy size={6} />}
      </Button>
    </div>
  );
}
