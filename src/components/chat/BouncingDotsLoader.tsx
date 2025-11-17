import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@/stores/useSessionStore";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface BouncingDotsLoaderProps {
  conversationId?: string;
}

const BouncingDotsLoader = ({ conversationId }: BouncingDotsLoaderProps) => {
  const busyState = useSessionStore((state) =>
    conversationId ? state.busyByConversationId[conversationId] : undefined,
  );
  const isBusy = busyState?.isBusy ?? false;
  const busyStartTime = busyState?.busyStartTime ?? null;
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isBusy || busyStartTime === null) {
      setElapsedMs(0);
      return undefined;
    }

    const updateElapsed = () => setElapsedMs(Date.now() - busyStartTime);
    updateElapsed();

    const intervalId =
      typeof window !== "undefined"
        ? window.setInterval(updateElapsed, 1000)
        : undefined;

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [busyStartTime, isBusy]);

  const elapsedLabel = useMemo(() => formatDuration(elapsedMs), [elapsedMs]);

  return (
    <div>
      <div className="w-full min-w-0">
        <div className="rounded-lg border px-3 py-2 bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500" />
              <div
                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
            <span
              className="text-xs font-mono text-muted-foreground"
              aria-live="polite"
            >
              {elapsedLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BouncingDotsLoader;
