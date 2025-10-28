import { useState, useMemo } from "react";
import {
  useConversation,
  useMessageStream,
  useReasoningStream,
  useSendMessage,
  useTurnDiff,
} from "@/hooks/useCodex";
import { Button } from "./ui/button";
import { DiffViewer } from "./filetree/DiffViewer";
import { ChatInput } from "./chat/ChatInput";
import type { MediaAttachment } from "@/types/chat";
import { buildMessageParams } from "@/utils/buildParams";
import { Sandbox } from "./config/Sandbox";
import { ProviderModels } from "@/components/config/provider-models";
import { ReasoningEffortSelector } from "./config/ReasoningEffortSelector";
import { SimpleConversationList } from "./SimpleConversationList";
import { useActiveConversationStore } from "@/stores/useActiveConversationStore";
import { useApprovalStore } from "@/stores/useApprovalStore";
import { PenSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";
import { useCodexApprovalRequests } from "@/hooks/useCodexApprovalRequests";
import { ExecApprovalRequestItem } from "./events/ExecApprovalRequestItem";
import { ApplyPatchApprovalRequestItem } from "./events/ApplyPatchApprovalRequestItem";
import MessageList from "./MessageList";
import ReasoningPanel from "./ReasoningPanel";

export function ChatInterface() {
  useCodexApprovalRequests();
  const { createConversation } = useConversation();
  const { activeConversationId: conversationId } = useActiveConversationStore();
  const [inputValue, setInputValue] = useState("");

  const { messages } = useMessageStream(conversationId);
  const { sections } = useReasoningStream(conversationId);
  const { sendMessage, interrupt, isSending } = useSendMessage();
  const { diffs, canUndo, undo } = useTurnDiff(conversationId);
  const buildNewConversationParams = useBuildNewConversationParams();
  const { activeConversationId, setActiveConversationId } =
    useActiveConversationStore();

  // Get approval requests from store
  const { execRequests, patchRequests } = useApprovalStore();

  // Filter requests for current conversation
  const currentExecRequests = useMemo(() => {
    if (!conversationId) return [];
    console.log(execRequests);
    return Object.values(execRequests).filter(
      (req) => req.conversationId === conversationId,
    );
  }, [execRequests, conversationId]);

  const currentPatchRequests = useMemo(() => {
    if (!conversationId) return [];
    console.log("patchRequests:", patchRequests);
    return Object.values(patchRequests).filter(
      (req) => req.conversationId === conversationId,
    );
  }, [patchRequests, conversationId]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleSendMessage = async (
    text: string,
    attachments: MediaAttachment[],
  ) => {
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      console.log("createConversation", buildNewConversationParams);
      const newConversation = await createConversation(
        buildNewConversationParams,
      );
      currentConversationId = newConversation.conversationId;
      setActiveConversationId(currentConversationId);
    }
    if (currentConversationId) {
      const params = buildMessageParams(
        currentConversationId,
        text.trim(),
        attachments,
      );
      console.log("sendMessage params:", params);
      sendMessage(currentConversationId, params.items);
    }
  };

  const handleCreateConversation = async () => {
    const newConversation = await createConversation(buildNewConversationParams);
    setActiveConversationId(newConversation.conversationId);
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-col border-r">
        <div className="p-2">
          <Button onClick={handleCreateConversation} className="w-full">
            <PenSquare className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
        <SimpleConversationList
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
        />
      </div>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length > 0 ? (
            <>
              <MessageList messages={messages} />
              {sections.length > 0 && <ReasoningPanel sections={sections} />}
              {currentExecRequests.map((req) => (
                <ExecApprovalRequestItem
                  key={req.callId}
                  event={{
                    msg: {
                      type: "exec_approval_request",
                      call_id: req.callId,
                      command: req.command,
                      cwd: req.cwd,
                      reason: req.reason,
                      parsed_cmd: req.parsedCmd,
                    },
                    id: "",
                  }}
                  conversationId={conversationId}
                />
              ))}
              {currentPatchRequests.map((req) => (
                <ApplyPatchApprovalRequestItem
                  key={req.callId}
                  conversationId={conversationId}
                  event={{
                    msg: {
                      type: "apply_patch_approval_request",
                      call_id: req.callId,
                      changes: req.changes,
                      reason: req.reason,
                      grant_root: req.grantRoot,
                    },
                    id: uuidv4(),
                  }}
                />
              ))}{" "}
              {diffs.map((diff) => (
                <DiffViewer key={diff.turnId} unifiedDiff={diff.unifiedDiff} />
              ))}
              {canUndo && (
                <div className="flex justify-center">
                  <Button onClick={undo} variant="outline">
                    Undo last change
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Start a new conversation
            </div>
          )}
        </div>

        <div className="border-t bg-background p-4">
          <ChatInput
            inputValue={inputValue}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onStopStreaming={() => conversationId && interrupt(conversationId)}
            disabled={isSending}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Sandbox />
            <ProviderModels />
            <ReasoningEffortSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
