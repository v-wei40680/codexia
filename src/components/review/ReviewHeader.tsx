import { useMemo } from "react";
import Instructions from "./Instructions";
import ErrorBanner from "./ErrorBanner";
import { Button } from "../ui/button";
import { Terminal } from "lucide-react";

interface SessionHeaderProps {
  cwd: string;
  instructions: string;
  totalTokens: number;
  sessionId: string;
  onRunCommand: (id: string, cwd: string) => void;
  onRefresh: () => void;
  isSessionLoading: boolean;
  hasSelection: boolean;
  sessionError: string | null;
}

export default function SessionHeader({
  cwd,
  instructions,
  totalTokens,
  sessionId,
  onRunCommand,
  onRefresh,
  isSessionLoading,
  hasSelection,
  sessionError,
}: SessionHeaderProps) {
  const tokenText = useMemo(
    () => Math.trunc(totalTokens / 1000) + "k",
    [totalTokens],
  );
  return (
    <section className="rounded-2xl border p-2 shadow-lg">
      <div className="flex flex-wrap items-center justify-between">
        {cwd || "Unknown"}
        <span className="flex gap-2">
          <Button size="icon" onClick={() => onRunCommand(sessionId, cwd)}>
            <Terminal />
          </Button>
          <span className="items-center">Token {tokenText}</span>
          <Button
            onClick={onRefresh}
            disabled={!hasSelection || isSessionLoading}
          >
            {isSessionLoading ? "Refreshing…" : "Refresh"}
          </Button>
        </span>
      </div>
      <ErrorBanner error={sessionError} />
      <Instructions instructions={instructions} />
    </section>
  );
}
