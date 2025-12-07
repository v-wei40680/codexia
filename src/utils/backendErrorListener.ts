import { listen } from "@/lib/tauri-proxy";
import { useEffect } from "react";
import { useSessionStore } from "@/stores/codex";
import { toast } from "sonner";

export interface BackendErrorPayload {
  code: number;
  message: string;
  data?: unknown;
}

export function useBackendErrorListener() {
  const resetBusyState = useSessionStore((state) => state.reset);

  useEffect(() => {
    let backendErrorUnlisten: (() => void) | null = null;

    (async () => {
      try {
        backendErrorUnlisten = await listen<BackendErrorPayload>(
          "codex:backend-error",
          (event) => {
            const { code, message } = event.payload;
            toast.error(
              `Backend error (code: ${code}): ${message || "Unknown error"}`,
            );
            resetBusyState();
          },
        );
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? (err as any).message
            : String(err);
        toast.error(
          "Failed to listen for backend errors:" +
            (message ? ` ${message}` : ""),
        );
      }
    })();

    return () => {
      backendErrorUnlisten?.();
    };
  }, [resetBusyState]);
}
