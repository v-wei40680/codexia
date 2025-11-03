import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { usePatchHistoryStore } from "@/stores/usePatchHistoryStore";
import { type CodexEvent } from "@/types/chat";
import type { FileChange } from "@/bindings/FileChange";

export function usePatchHistory(activeConversationId?: string | null) {
  const { registerPatchBegin, registerPatchEnd, records } = usePatchHistoryStore(
    useShallow((state) => ({
      registerPatchBegin: state.registerBegin,
      registerPatchEnd: state.registerEnd,
      records: state.records,
    })),
  );

  const patchEntries = useMemo(() => {
    if (!activeConversationId) {
      return [];
    }
    return records[activeConversationId] ?? [];
  }, [activeConversationId, records]);

  const totalFileChanges = useMemo(
    () =>
      patchEntries.reduce((count, entry) => {
        return count + Object.keys(entry.changes ?? {}).length;
      }, 0),
    [patchEntries],
  );

  const handlePatchApplyBegin = useCallback(
    (event: CodexEvent) => {
      const {
        conversationId: eventConversationId,
        msg,
      } = event.payload.params;

      if (msg.type !== "patch_apply_begin") {
        return;
      }

      const normalizedChanges = Object.fromEntries(
        Object.entries(msg.changes ?? {}).map(([path, change]) => [
          path,
          change ?? null,
        ]),
      ) as Record<string, FileChange | null>;

      registerPatchBegin(eventConversationId, {
        callId: msg.call_id,
        autoApproved: msg.auto_approved,
        changes: normalizedChanges,
      });
    },
    [registerPatchBegin],
  );

  const handlePatchApplyEnd = useCallback(
    (event: CodexEvent) => {
      const {
        conversationId: eventConversationId,
        msg,
      } = event.payload.params;

      if (msg.type !== "patch_apply_end") {
        return;
      }

      registerPatchEnd(eventConversationId, {
        callId: msg.call_id,
        success: msg.success,
        stdout: msg.stdout,
        stderr: msg.stderr,
      });
    },
    [registerPatchEnd],
  );

  return {
    patchEntries,
    totalFileChanges,
    hasPatchHistory: patchEntries.length > 0,
    handlePatchApplyBegin,
    handlePatchApplyEnd,
  };
}
