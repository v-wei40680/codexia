import { useEffect } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { ExecCommandApprovalParams } from "@/bindings/ExecCommandApprovalParams";
import { useApprovalStore } from "@/stores/useApprovalStore";
import type { FileChange } from "@/bindings/FileChange";

interface ExecCommandApprovalNotification {
  requestToken: string;
  params: ExecCommandApprovalParams;
}

type ApplyPatchApprovalParamsWire = {
  conversationId?: string;
  conversation_id?: string;
  callId?: string;
  call_id?: string;
  reason?: string | null;
  grantRoot?: string | null;
  grant_root?: string | null;
  fileChanges?: Record<string, FileChange>;
  file_changes?: Record<string, FileChange>;
};

interface ApplyPatchApprovalNotification {
  requestToken: string;
  params: ApplyPatchApprovalParamsWire;
}

export function useCodexApprovalRequests() {
  const {upsertExecRequest, upsertPatchRequest} = useApprovalStore();

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setup = async () => {
      try {
        const execRequestUnlisten = await listen<ExecCommandApprovalNotification>(
          "codex:exec-command-request",
          (event) => {
            const payload = event.payload;
            if (!payload || !payload.params) {
              return;
            }
            const { requestToken, params } = payload;
            if (!requestToken) {
              return;
            }

            upsertExecRequest({
              requestToken,
              conversationId: params.conversationId,
              callId: params.callId,
              command: params.command,
              cwd: params.cwd,
              reason: params.reason ?? null,
              createdAt: Date.now(),
            });
          },
        );
        unlisteners.push(execRequestUnlisten);

        const patchRequestUnlisten = await listen<ApplyPatchApprovalNotification>(
          "codex:apply-patch-request",
          (event) => {
            const payload = event.payload;
            if (!payload || !payload.params) {
              return;
            }
            const { requestToken, params: rawParams } = payload;
            if (!requestToken) {
              return;
            }

            const conversationId =
              rawParams.conversationId ?? rawParams.conversation_id ?? null;
            const callId = rawParams.callId ?? rawParams.call_id ?? null;
            if (!conversationId || !callId) {
              console.warn(
                "Received apply patch request without conversation or call id",
                rawParams,
              );
              return;
            }

            const reason =
              rawParams.reason !== undefined ? rawParams.reason : null;
            const grantRoot =
              rawParams.grantRoot ?? rawParams.grant_root ?? null;
            const fileChanges =
              rawParams.fileChanges ?? rawParams.file_changes ?? {};

            upsertPatchRequest({
              requestToken,
              conversationId,
              callId,
              reason,
              grantRoot,
              changes: fileChanges,
              createdAt: Date.now(),
            });
          },
        );
        unlisteners.push(patchRequestUnlisten);
      } catch (error) {
        console.error("Failed to initialize approval listeners", error);
      }
    };

    setup();

    return () => {
      unlisteners.forEach((unlisten) => {
        try {
          unlisten();
        } catch (error) {
          console.warn("Failed to remove approval listener", error);
        }
      });
    };
  }, [upsertExecRequest, upsertPatchRequest]);
}
