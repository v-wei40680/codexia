import { invoke } from "@/lib/tauri-proxy";
import { useState } from "react";
import { useConversationEvents } from "./useConversationEvents";
import { CodexEvent } from "@/types/chat";

interface FileSnapshot {
  path: string;
  content: string;
  timestamp: number;
}

export function useFileWatcher(conversationId: string | null) {
  const [snapshots, setSnapshots] = useState<Map<string, FileSnapshot[]>>(
    new Map(),
  );

  // Listen before patch application, save file snapshots
  const handlePatchBegin = async (event: CodexEvent) => {
    const {msg} = event.payload.params
    if (msg.type !== "patch_apply_begin") return;
    const filesToSnapshot = Object.keys(msg.changes || {});

    for (const filePath of filesToSnapshot) {
      try {
        const content = await invoke<string>("read_file", { filePath });

        setSnapshots((prev) => {
          const newMap = new Map(prev);
          const fileSnapshots = newMap.get(filePath) || [];

          fileSnapshots.push({
            path: filePath,
            content,
            timestamp: Date.now(),
          });

          // Only keep the latest 5 snapshots
          if (fileSnapshots.length > 5) {
            fileSnapshots.shift();
          }

          newMap.set(filePath, fileSnapshots);
          return newMap;
        });
      } catch (error) {
        console.error(`Failed to snapshot ${filePath}:`, error);
      }
    }
  };

  // Restore file to a specific snapshot
  const restoreSnapshot = async (
    filePath: string,
    snapshotIndex: number = 0,
  ) => {
    const fileSnapshots = snapshots.get(filePath);
    if (!fileSnapshots || snapshotIndex >= fileSnapshots.length) {
      throw new Error("Snapshot not found");
    }

    const snapshot = fileSnapshots[fileSnapshots.length - 1 - snapshotIndex];

    try {
      await invoke("write_file", {
        path: filePath,
        content: snapshot.content,
        mode: "rewrite",
      });
      return true;
    } catch (error) {
      console.error(`Failed to restore ${filePath}:`, error);
      return false;
    }
  };

  // Get all snapshots of a file
  const getFileSnapshots = (filePath: string) => {
    return snapshots.get(filePath) || [];
  };

  useConversationEvents(conversationId, {
    onPatchApplyBegin: handlePatchBegin,
  });

  return {
    restoreSnapshot,
    getFileSnapshots,
    hasSnapshots: (path: string) => (snapshots.get(path)?.length || 0) > 0,
  };
}
