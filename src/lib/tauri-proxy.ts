import type { InvokeArgs, InvokeOptions } from "@tauri-apps/api/core";
import type {
  Event as TauriEvent,
  EventCallback,
  EventName,
  Options as EventOptions,
  UnlistenFn,
} from "@tauri-apps/api/event";

interface RpcEnvelope {
  status?: "success" | "error" | string;
  payload?: unknown;
}

interface PendingCall {
  resolve: (value: RpcEnvelope) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

let websocket: WebSocket | null = null;
let websocketReady: Promise<void> | null = null;
const pendingInvocations = new Map<number, PendingCall>();
let messageCounter = 0;
let baseHandlerBound = false;

let tauriCoreModulePromise: Promise<typeof import("@tauri-apps/api/core")> | null = null;
let tauriEventModulePromise: Promise<typeof import("@tauri-apps/api/event")> | null = null;

async function loadTauriCore() {
  if (!tauriCoreModulePromise) {
    // Lazily import the native Tauri API so web builds do not touch window.__TAURI_INTERNALS__.
    tauriCoreModulePromise = import("@tauri-apps/api/core");
  }

  return tauriCoreModulePromise;
}

async function loadTauriEvent() {
  if (!tauriEventModulePromise) {
    tauriEventModulePromise = import("@tauri-apps/api/event");
  }

  return tauriEventModulePromise;
}

function isNativeTauri(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const internals = (window as any).__TAURI_INTERNALS__;
  const legacyInternals = (window as any).__TAURI__;
  return Boolean(internals?.invoke || legacyInternals?.invoke);
}

function websocketUrl(): string {
  if (typeof window === "undefined") {
    throw new Error("WebSocket is not available in this environment");
  }

  const { protocol, host } = window.location;
  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${host}/remote_ui_ws`;
}

function ensureBaseHandler(socket: WebSocket) {
  if (baseHandlerBound) {
    return;
  }

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const parsed = JSON.parse(event.data as string);

      // Check if this is an event (has event field) or a response (has id field)
      if (parsed && typeof parsed.event === "string") {
        console.log(`[Remote Bridge] Received event: ${parsed.event}`, parsed);
        // Events are handled by listen() subscriptions, not here
        return;
      }

      console.log("[Remote Bridge] Received command response:", parsed);

      if (parsed && typeof parsed.id === "number" && parsed.payload !== undefined) {
        const deferred = pendingInvocations.get(parsed.id);
        if (!deferred) {
          console.warn(`[Remote Bridge] No pending invocation found for ID: ${parsed.id}`);
          return;
        }

        pendingInvocations.delete(parsed.id);
        clearTimeout(deferred.timeout);
        try {
          const envelope = parseEnvelope(parsed.payload);
          deferred.resolve(envelope);
        } catch (error) {
          console.error(`[Remote Bridge] Failed to parse envelope for ID: ${parsed.id}`, error);
          deferred.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    } catch (error) {
      console.error("[Remote Bridge] Failed to handle remote message", error, event.data);
    }
  });

  baseHandlerBound = true;
}

function resetWebsocketState(error?: Error) {
  websocket = null;
  websocketReady = null;
  baseHandlerBound = false;

  for (const [id, pending] of pendingInvocations.entries()) {
    clearTimeout(pending.timeout);
    pending.reject(
      error ?? new Error(`Remote bridge disconnected before completing invocation ${id}`),
    );
    pendingInvocations.delete(id);
  }
}

async function ensureWebsocket(): Promise<void> {
  if (isNativeTauri()) {
    return;
  }

  if (websocket && websocket.readyState === WebSocket.OPEN) {
    return;
  }

  if (websocketReady) {
    return websocketReady;
  }

  websocketReady = new Promise<void>((resolve, reject) => {
    try {
      const url = websocketUrl();
      console.log(`[Remote Bridge] Connecting to WebSocket: ${url}`);
      const socket = new WebSocket(url);
      websocket = socket;

      socket.addEventListener("open", () => {
        console.log("[Remote Bridge] WebSocket connected successfully");
        ensureBaseHandler(socket);
        resolve();
      });

      socket.addEventListener("close", (event) => {
        console.warn(`[Remote Bridge] WebSocket closed - Code: ${event.code}, Reason: ${event.reason}`);
        resetWebsocketState();
      });

      socket.addEventListener("error", (event) => {
        const errorMessage = (event as ErrorEvent)?.message ?? "Remote bridge error";
        console.error(`[Remote Bridge] WebSocket error: ${errorMessage}`, event);
        const error = new Error(errorMessage);
        resetWebsocketState(error);
        reject(error);
      });
    } catch (error) {
      console.error("[Remote Bridge] Failed to create WebSocket", error);
      const err = error instanceof Error ? error : new Error(String(error));
      resetWebsocketState(err);
      reject(err);
    }
  });

  return websocketReady;
}

function parseEnvelope(raw: unknown): RpcEnvelope {
  if (raw === null || raw === undefined) {
    return {};
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as RpcEnvelope;
    } catch (error) {
      throw new Error(`Invalid payload received from remote bridge: ${raw}`);
    }
  }

  if (typeof raw === "object") {
    return raw as RpcEnvelope;
  }

  return { payload: raw };
}

// Timeout configuration for different command types
const COMMAND_TIMEOUTS: Record<string, number> = {
  // Long-running operations need extended timeouts
  interrupt_conversation: 120_000, // 2 minutes
  send_user_message: 300_000, // 5 minutes - AI responses can be slow
  turn_start: 300_000, // 5 minutes
  new_conversation: 120_000, // 2 minutes
  resume_conversation: 120_000, // 2 minutes
  initialize_client: 60_000, // 1 minute
  // Default for other commands
  default: 30_000, // 30 seconds
};

function getCommandTimeout(cmd: string): number {
  return COMMAND_TIMEOUTS[cmd] ?? COMMAND_TIMEOUTS.default;
}

export async function invoke<T>(
  cmd: string,
  args?: InvokeArgs,
  options?: InvokeOptions,
): Promise<T> {
  if (isNativeTauri()) {
    const { invoke: tauriInvoke } = await loadTauriCore();
    return tauriInvoke(cmd, args, options);
  }

  await ensureWebsocket();

  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    throw new Error("Remote bridge is not connected");
  }

  return new Promise<T>((resolve, reject) => {
    const id = ++messageCounter;
    const timeoutMs = getCommandTimeout(cmd);

    console.log(`[Remote Invoke] Command: ${cmd}, ID: ${id}, Timeout: ${timeoutMs}ms`, args);

    const timeout = setTimeout(() => {
      pendingInvocations.delete(id);
      console.error(`[Remote Invoke] Timeout for command: ${cmd}, ID: ${id}`);
      reject(new Error(`Remote invoke timeout for command '${cmd}' (${timeoutMs}ms)`));
    }, timeoutMs);

    pendingInvocations.set(id, {
      resolve: (envelope) => {
        console.log(`[Remote Invoke] Response for command: ${cmd}, ID: ${id}`, envelope);
        const status = envelope.status ?? "success";
        if (status === "success") {
          resolve(envelope.payload as T);
        } else {
          console.error(`[Remote Invoke] Error for command: ${cmd}, ID: ${id}`, envelope.payload);
          reject(new Error(String(envelope.payload ?? `Remote error invoking '${cmd}'`)));
        }
      },
      reject,
      timeout,
    });

    const message = {
      id,
      cmd,
      args,
      option: options,
    };

    try {
      console.log(`[Remote Invoke] Sending message for command: ${cmd}, ID: ${id}`);
      websocket!.send(JSON.stringify(message));
    } catch (error) {
      clearTimeout(timeout);
      pendingInvocations.delete(id);
      console.error(`[Remote Invoke] Send error for command: ${cmd}, ID: ${id}`, error);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export async function listen<T>(
  event: EventName,
  handler: EventCallback<T>,
  options?: EventOptions,
): Promise<UnlistenFn> {
  if (isNativeTauri()) {
    const { listen: tauriListen } = await loadTauriEvent();
    return tauriListen(event, handler, options);
  }

  await ensureWebsocket();

  if (!websocket) {
    throw new Error("Remote bridge is not connected");
  }

  const messageHandler = (incoming: MessageEvent) => {
    try {
      const parsed = JSON.parse(incoming.data as string);
      if (!parsed || typeof parsed !== "object") {
        return;
      }

      // Log all events for debugging
      if (parsed.event) {
        console.log(`[Remote Event] Received event: ${parsed.event}`, parsed);
      }

      if (parsed.event !== event) {
        return;
      }

      handler(parsed as TauriEvent<T>);
    } catch (error) {
      console.error("Failed to process remote event", error);
    }
  };

  websocket.addEventListener("message", messageHandler);

  return () => {
    websocket?.removeEventListener("message", messageHandler);
  };
}

export function isRemoteRuntime(): boolean {
  return !isNativeTauri();
}

export type { Event as TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
