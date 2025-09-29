import { invoke } from "@tauri-apps/api/core";
import type { ApprovalRequest } from "@/types/codex";
import type { ChatMessage } from "@/types/chat";
import type { CodexEventHandler } from "./types";

const normalizeSessionId = (
  fallbackSessionId: string,
  eventSessionId?: string,
): string => {
  const candidate = eventSessionId || fallbackSessionId;
  return candidate.startsWith("codex-event-")
    ? candidate.replace("codex-event-", "")
    : candidate;
};

const reportAutoApprovalError = (
  context: Parameters<CodexEventHandler>[1],
  eventId: string,
  error: unknown,
): void => {
  console.error("Failed to auto-approve request", error);
  const message: ChatMessage = {
    id: `${eventId}-auto-approval-error`,
    role: "system",
    content: `Failed to auto-approve request: ${String(error)}`,
    timestamp: Date.now(),
  };
  context.addMessageToStore(message);
};

const handleExecApprovalRequest: CodexEventHandler = (event, context) => {
  const msg = event.msg;
  if (msg.type !== "exec_approval_request") {
    return;
  }

  const { addMessageToStore, autoApproveApprovals } = context;
  if (autoApproveApprovals) {
    const sessionId = normalizeSessionId(context.sessionId, event.session_id);
    void (async () => {
      try {
        await invoke("approve_execution", {
          sessionId,
          approvalId: event.id,
          approved: true,
        });
        console.log(`✅ Auto-approved exec request ${event.id}`);
      } catch (error) {
        reportAutoApprovalError(context, event.id, error);
      }
    })();
    return;
  }

  const command = msg.command.join(" ");

  const execMessage: ChatMessage = {
    id: event.id,
    role: "approval",
    title: `🔧 Execute: ${command}`,
    content: `Working directory: ${msg.cwd}`,
    timestamp: new Date().getTime(),
    approvalRequest: {
      id: event.id,
      type: "exec",
      command,
      cwd: msg.cwd,
      call_id: msg.call_id,
    },
    eventType: msg.type,
  };

  addMessageToStore(execMessage);
};

const handlePatchApprovalRequest: CodexEventHandler = (event, context) => {
  const msg = event.msg;
  if (msg.type !== "patch_approval_request") {
    return;
  }

  const { addMessageToStore, autoApproveApprovals } = context;
  if (autoApproveApprovals) {
    const sessionId = normalizeSessionId(context.sessionId, event.session_id);
    void (async () => {
      try {
        await invoke("approve_patch", {
          sessionId,
          approvalId: event.id,
          approved: true,
        });
        console.log(`✅ Auto-approved patch request ${event.id}`);
      } catch (error) {
        reportAutoApprovalError(context, event.id, error);
      }
    })();
    return;
  }

  const patchApprovalRequest: ApprovalRequest = {
    id: event.id,
    type: "patch",
    patch: msg.patch,
    files: msg.files,
  };

  const patchMessage: ChatMessage = {
    id: event.id,
    role: "approval",
    title: `📝 Patch: ${msg.files?.join(", ") || "unknown files"}`,
    content: "Requesting approval to apply patch",
    timestamp: new Date().getTime(),
    approvalRequest: patchApprovalRequest,
    eventType: msg.type,
  };
  addMessageToStore(patchMessage);
};

const makeChangeSummary = (file: string, change: any): string => {
  try {
    if (change.add) {
      const content =
        change.add.content || change.add.unified_diff || JSON.stringify(change.add, null, 2);
      return `Add ${file}\n${content}`;
    }
    if (change.remove) {
      const content =
        change.remove.content || change.remove.unified_diff || JSON.stringify(change.remove, null, 2);
      return `Remove ${file}\n${content}`;
    }
    if (change.modify) {
      const content =
        change.modify.content || change.modify.unified_diff || JSON.stringify(change.modify, null, 2);
      return `Modify ${file}\n${content}`;
    }
    if (change.update) {
      const mv = change.update.move_path ? `Move to: ${change.update.move_path}\n` : "";
      const diff = change.update.unified_diff || change.update.content || "";
      return `Update ${file}\n${mv}${diff}`.trim();
    }
    return `${file}\n${JSON.stringify(change, null, 2)}`;
  } catch {
    return `Change ${file}`;
  }
};

const handleApplyPatchApprovalRequest: CodexEventHandler = (event, context) => {
  const msg = event.msg;
  if (msg.type !== "apply_patch_approval_request") {
    return;
  }

  const { addMessageToStore, autoApproveApprovals } = context;
  if (autoApproveApprovals) {
    const sessionId = normalizeSessionId(context.sessionId, event.session_id);
    void (async () => {
      try {
        await invoke("approve_patch", {
          sessionId,
          approvalId: event.id,
          approved: true,
        });
        console.log(`✅ Auto-approved apply patch request ${event.id}`);
      } catch (error) {
        reportAutoApprovalError(context, event.id, error);
      }
    })();
    return;
  }

  const approvalRequest: ApprovalRequest = {
    id: event.id,
    type: "apply_patch",
    call_id: msg.call_id,
    changes: msg.changes,
    reason: msg.reason,
    grant_root: msg.grant_root,
  };

  let changesText = "No change details available";
  let titleFiles = "";
  const msgChanges = msg.changes;

  if (msgChanges && typeof msgChanges === "object" && !Array.isArray(msgChanges)) {
    const entries = Object.entries(msgChanges as Record<string, any>);
    if (entries.length > 0) {
      const rel = (p: string) => {
        const root = msg.grant_root as string | undefined;
        if (root && p.startsWith(root)) {
          const trimmed = p.slice(root.length);
          return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
        }
        return p;
      };
      changesText = entries
        .map(([file, change]) => makeChangeSummary(rel(file), change))
        .join("\n\n");
      titleFiles = entries.map(([file]) => rel(file)).join(", ");
    }
  } else if (Array.isArray(msgChanges)) {
    changesText = (msgChanges as any[])
      .map((change, idx) => makeChangeSummary(`change #${idx + 1}`, change))
      .join("\n\n");
  }

  const applyPatchMessage: ChatMessage = {
    id: event.id,
    role: "approval",
    title: `🔄 Apply Patch${titleFiles ? `: ${titleFiles}` : ""}`,
    content: `${msg.reason ? `Reason: ${msg.reason}\n\n` : ""}Changes:\n${changesText}`,
    timestamp: new Date().getTime(),
    approvalRequest,
    eventType: msg.type,
  };

  addMessageToStore(applyPatchMessage);
};

export const approvalHandlers: Record<string, CodexEventHandler> = {
  exec_approval_request: handleExecApprovalRequest,
  patch_approval_request: handlePatchApprovalRequest,
  apply_patch_approval_request: handleApplyPatchApprovalRequest,
};
