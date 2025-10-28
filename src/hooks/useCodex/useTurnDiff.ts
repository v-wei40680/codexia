// imports removed: TaskStartedEvent, TurnDiffEvent (not needed here)
import { invoke } from "@/lib/tauri-proxy";
import { useEffect, useState } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";
import { CodexEvent } from "@/types/chat";

interface FileDiff {
  turnId: string;
  unifiedDiff: string;
  timestamp: number;
  canRevert: boolean;
}

export function useTurnDiff(conversationId: string | null) {
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);

  // Listen for turn start, record turn ID
  const handleTaskStarted = (_event: CodexEvent) => {
    const turnId = v4();
    setCurrentTurnId(turnId);
  };

  // Listen for file modification diffs
  const handleTurnDiff = (event: CodexEvent) => {
    if (!currentTurnId) return;
    const { msg } = event.payload.params;
    if (msg.type !== "turn_diff") return;
    setDiffs((prev) => [
      ...prev,
      {
        turnId: currentTurnId,
        unifiedDiff: msg.unified_diff,
        timestamp: Date.now(),
        canRevert: true,
      },
    ]);
  };

  // Turn complete, clear current turn ID
  const handleTaskComplete = () => {
    setCurrentTurnId(null);
  };

  // Undo the most recent change
  const undo = async () => {
    const lastDiff = diffs[diffs.length - 1];
    if (!lastDiff || !lastDiff.canRevert) return;

    try {
      // Option 1: Revert using Git
      await invoke("exec_one_off_command", {
        command: ["git", "apply", "--reverse"],
        stdin: lastDiff.unifiedDiff,
      });

      // Mark as reverted
      setDiffs((prev) =>
        prev.map((d) =>
          d.turnId === lastDiff.turnId ? { ...d, canRevert: false } : d,
        ),
      );
    } catch (error) {
      console.error("Undo failed:", error);
      // Can prompt user to manually revert
    }
  };

  // Batch undo to a specific turn
  const undoToTurn = async (targetTurnId: string) => {
    const targetIndex = diffs.findIndex((d) => d.turnId === targetTurnId);
    if (targetIndex === -1) return;

    // Revert one by one from newest to target
    const diffsToRevert = diffs.slice(targetIndex).reverse();

    for (const diff of diffsToRevert) {
      if (diff.canRevert) {
        try {
          await invoke("exec_one_off_command", {
            command: ["git", "apply", "--reverse"],
            stdin: diff.unifiedDiff,
          });
        } catch (error) {
          console.error(`Failed to revert turn ${diff.turnId}:`, error);
          break;
        }
      }
    }

    // Update status
    setDiffs((prev) =>
      prev.map((d) =>
        diffsToRevert.some((rd) => rd.turnId === d.turnId)
          ? { ...d, canRevert: false }
          : d,
      ),
    );
  };

  // Save current state as a checkpoint
  const createCheckpoint = async () => {
    try {
      await invoke("exec_one_off_command", {
        command: ["git", "add", "-A"],
      });

      const timestamp = new Date().toISOString();
      await invoke("exec_one_off_command", {
        command: ["git", "commit", "-m", `Codexia checkpoint: ${timestamp}`],
      });

      return true;
    } catch (error) {
      console.error("Checkpoint failed:", error);
      return false;
    }
  };

  // Periodically clean up old diffs (keep the most recent 20 turns)
  useEffect(() => {
    if (diffs.length > 20) {
      setDiffs((prev) => prev.slice(-20));
    }
  }, [diffs.length]);

  useConversationEvents(conversationId, {
    onTaskStarted: handleTaskStarted,
    onTurnDiff: handleTurnDiff,
    onTaskComplete: handleTaskComplete,
  });

  const canUndo = diffs.length > 0 && diffs[diffs.length - 1].canRevert;

  return {
    diffs,
    canUndo,
    undo,
    undoToTurn,
    createCheckpoint,
  };
}
