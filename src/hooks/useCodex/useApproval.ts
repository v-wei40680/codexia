import { ApplyPatchApprovalRequestEvent } from "@/bindings/ApplyPatchApprovalRequestEvent";
import { ExecApprovalRequestEvent } from "@/bindings/ExecApprovalRequestEvent";
import { ExecCommandEndEvent } from "@/bindings/ExecCommandEndEvent";
import { PatchApplyEndEvent } from "@/bindings/PatchApplyEndEvent";
import { invoke } from "@/lib/tauri-proxy";
import { useEffect, useMemo, useState } from "react";
import { v4 } from "uuid";
import { useConversationEvents } from "./useConversationEvents";

interface ApprovalRequest {
  id: string;
  type: "exec" | "patch";
  callId: string;
  status: "pending" | "approved" | "rejected" | "completed";
  data: ExecApprovalRequestEvent | ApplyPatchApprovalRequestEvent;
  timestamp: number;
}

export function useApproval(conversationId: string | null) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);

  // Only display pending requests
  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );

  const handleExecApprovalRequest = (event: ExecApprovalRequestEvent) => {
    setRequests((prev) => [
      ...prev,
      {
        id: v4(),
        type: "exec",
        callId: event.call_id,
        status: "pending",
        data: event,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleApplyPatchApprovalRequest = (
    event: ApplyPatchApprovalRequestEvent,
  ) => {
    setRequests((prev) => [
      ...prev,
      {
        id: v4(),
        type: "patch",
        callId: event.call_id,
        status: "pending",
        data: event,
        timestamp: Date.now(),
      },
    ]);
  };

  // Listen for command execution completion, automatically mark as completed
  const handleExecEnd = (event: ExecCommandEndEvent) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.type === "exec" && r.callId === event.call_id
          ? { ...r, status: "completed" }
          : r,
      ),
    );
  };

  // Listen for patch application completion
  const handlePatchEnd = (event: PatchApplyEndEvent) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.type === "patch" && r.callId === event.call_id
          ? { ...r, status: "completed" }
          : r,
      ),
    );
  };

  const approve = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    if (request.type === "exec") {
      await invoke("respond_exec_command_request", {
        request_token: request.callId,
        decision: "Allow",
      });
    } else {
      // Patch approval uses different methods
      await invoke("respond_apply_patch_request", {
        request_token: request.callId,
        decision: "Allow",
      });
    }

    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r)),
    );
  };

  const reject = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    const decision = "Deny";
    if (request.type === "exec") {
      await invoke("respond_exec_command_request", {
        request_token: request.callId,
        decision,
      });
    } else {
      await invoke("respond_apply_patch_request", {
        request_token: request.callId,
        decision,
      });
    }

    // Mark as completed directly after rejection (no longer displayed)
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "completed" } : r)),
    );
  };

  // Periodically clean up completed requests (keep the latest 100)
  useEffect(() => {
    const cleanup = () => {
      setRequests((prev) => {
        const completed = prev.filter((r) => r.status === "completed");
        const pending = prev.filter((r) => r.status !== "completed");

        // Keep all pending + latest 100 completed
        if (completed.length > 100) {
          const sorted = completed.sort((a, b) => b.timestamp - a.timestamp);
          return [...pending, ...sorted.slice(0, 100)];
        }
        return prev;
      });
    };

    const interval = setInterval(cleanup, 60000); // Clean up once per minute
    return () => clearInterval(interval);
  }, []);

  useConversationEvents(conversationId, {
    onExecApprovalRequest: handleExecApprovalRequest,
    onApplyPatchApprovalRequest: handleApplyPatchApprovalRequest,
    onExecCommandEnd: handleExecEnd,
    onPatchApplyEnd: handlePatchEnd,
  });

  return {
    requests: pendingRequests, // Only return pending approvals
    allRequests: requests, // If you need to view history
    approve,
    reject,
  };
}
