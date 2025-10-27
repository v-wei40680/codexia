import { NewConversationParams } from "@/bindings/NewConversationParams";
import { NewConversationResponse } from "@/bindings/NewConversationResponse";
import { ReasoningEffort } from "@/bindings/ReasoningEffort";
import { invoke } from "@/lib/tauri-proxy";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useState } from "react";

interface ConversationMetadata {
  model: string | null;
  reasoningEffort: ReasoningEffort | null;
  rolloutPath: string | null;
  status: "idle" | "initializing" | "ready" | "error";
  error: string | null;
}

export function useConversation() {
  const { activeConversationId, setActiveConversationId } = useActiveConversationStore();
  const [metadata, setMetadata] = useState<ConversationMetadata>({
    model: null,
    reasoningEffort: null,
    rolloutPath: null,
    status: "idle",
    error: null,
  });

  const createConversation = async (params: NewConversationParams): Promise<NewConversationResponse> => {
    setMetadata((prev) => ({ ...prev, status: "initializing", error: null }));
    try {
      const response = await invoke<NewConversationResponse>(
        "new_conversation",
        { params },
      );
      console.log("new_conversation response", response);
      
      setActiveConversationId(response.conversationId);
      
      setMetadata({
        model: response.model,
        reasoningEffort: response.reasoningEffort,
        rolloutPath: response.rolloutPath,
        status: 'ready',
        error: null,
      });
      return response;
    } catch (err: any) {
      console.log("new_conversation err:", err);
      setMetadata((prev) => ({ ...prev, status: "error", error: err.toString() }));
      throw err;
    }
  };

  const resumeConversation = async (path: string) => {
    setMetadata((prev) => ({ ...prev, status: "initializing", error: null }));
    try {
      const response = await invoke<NewConversationResponse>("resume_conversation", { path });
      
      setActiveConversationId(response.conversationId);
      
      setMetadata({
        model: response.model,
        reasoningEffort: response.reasoningEffort,
        rolloutPath: response.rolloutPath,
        status: 'ready',
        error: null,
      });
    } catch (err: any) {
      setMetadata((prev) => ({ ...prev, status: "error", error: err.toString() }));
    }
  };

  const archiveConversation = async () => {
    if (!activeConversationId) return;
    try {
      await invoke("archive_conversation", {
        conversation_id: activeConversationId,
        rollout_path: metadata.rolloutPath,
      });
    } catch (err: any) {
      console.error("Failed to archive conversation:", err);
    }
  };

  return {
    conversationId: activeConversationId,
    ...metadata,
    createConversation,
    resumeConversation,
    archiveConversation,
  };
}
