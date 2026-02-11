import { useCallback, useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";

type UpdateStage =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "restarting"
  | "error";

export type UpdateState = {
  stage: UpdateStage;
  version?: string;
  error?: string;
};

type UseUpdaterOptions = {
  enabled?: boolean;
  onDebug?: (entry: DebugEntry) => void;
};

type DebugEntry = {
  id: string;
  timestamp: number;
  source: "error";
  label: string;
  payload: string;
};

export function useUpdater({ enabled = true, onDebug }: UseUpdaterOptions) {
  const [state, setState] = useState<UpdateState>({ stage: "idle" });
  const updateRef = useRef<Update | null>(null);

  const resetToIdle = useCallback(async () => {
    const update = updateRef.current;
    updateRef.current = null;
    setState({ stage: "idle" });
    await update?.close();
  }, []);

  const checkForUpdates = useCallback(async () => {
    let update: Awaited<ReturnType<typeof check>> | null = null;
    try {
      setState({ stage: "checking" });
      update = await check();
      if (!update) {
        setState({ stage: "idle" });
        return;
      }

      updateRef.current = update;
      setState({
        stage: "available",
        version: update.version,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      onDebug?.({
        id: `${Date.now()}-client-updater-error`,
        timestamp: Date.now(),
        source: "error",
        label: "updater/error",
        payload: message,
      });
      setState({ stage: "error", error: message });
    } finally {
      if (!updateRef.current) {
        await update?.close();
      }
    }
  }, [onDebug]);

  const startUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) {
      await checkForUpdates();
      return;
    }

    setState((prev) => ({
      ...prev,
      stage: "downloading",
      error: undefined,
    }));

    try {
      setState((prev) => ({
        ...prev,
        stage: "installing",
      }));
      await update.downloadAndInstall();

      setState((prev) => ({
        ...prev,
        stage: "restarting",
      }));
      await relaunch();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      onDebug?.({
        id: `${Date.now()}-client-updater-error`,
        timestamp: Date.now(),
        source: "error",
        label: "updater/error",
        payload: message,
      });
      setState((prev) => ({
        ...prev,
        stage: "error",
        error: message,
      }));
    }
  }, [checkForUpdates, onDebug]);

  useEffect(() => {
    if (!enabled || import.meta.env.DEV || !isTauri()) {
      return;
    }
    void checkForUpdates();
  }, [checkForUpdates, enabled]);


  return {
    state,
    hasUpdate: state.stage === "available",
    startUpdate,
    dismiss: resetToIdle,
  };
}
