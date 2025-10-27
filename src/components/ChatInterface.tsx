import { useState } from "react";
import {
  useApproval,
  useConversation,
  useMessageStream,
  useReasoningStream,
  useSendMessage,
  useToolCalls,
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
import { PenSquare } from "lucide-react";
import { useBuildNewConversationParams } from "@/hooks/useBuildNewConversationParams";

// Placeholder for MessageList component
const MessageList = ({ messages }: { messages: any[] }) => (
  <div className="h-full">
    {messages.map((msg, index) => (
      <div key={index} className={`message ${msg.role}`}>
        <strong>{msg.role}:</strong> <div className="whitespace-pre-wrap max-w-full overflow-x-auto">{msg.content}</div>
      </div>
    ))}
  </div>
);

// Placeholder for ReasoningPanel component
const ReasoningPanel = ({ sections }: { sections: any[] }) => (
  <div className="reasoning-panel">
    <h3>Reasoning</h3>
    {sections.map((section, index) => (
      <div key={index} className="reasoning-section">
        {section.content}
      </div>
    ))}
  </div>
);

// Placeholder for ApprovalCard component
const ApprovalCard = ({
  request,
  onApprove,
  onReject,
}: {
  request: any;
  onApprove: () => void;
  onReject: () => void;
}) => (
  <div className="approval-card">
    <h4>Approval Request: {request.type}</h4>
    <p>{JSON.stringify(request.data)}</p>
    <Button onClick={onApprove}>Approve</Button>
    <Button onClick={onReject}>Reject</Button>
  </div>
);

// Placeholder for ToolCallStatus component
const ToolCallStatus = ({ calls }: { calls: any[] }) => (
  <div className="tool-call-status">
    <h3>Active Tool Calls</h3>
    {calls.map((call, index) => (
      <div key={index} className="tool-call">
        {call.type}: {call.status}
      </div>
    ))}
  </div>
);

export function ChatInterface() {
  const { createConversation } = useConversation();
  const { activeConversationId: conversationId } = useActiveConversationStore();
  const [inputValue, setInputValue] = useState("");

  const { messages } = useMessageStream(conversationId);
  const { sections } = useReasoningStream(conversationId);
  const { requests, approve, reject } = useApproval(conversationId);
  const { sendMessage, interrupt, isSending } = useSendMessage({});
  const { toolCalls } = useToolCalls(conversationId);
  const { diffs, canUndo, undo } = useTurnDiff(conversationId);
  const buildNewConversationParams = useBuildNewConversationParams();
  const { activeConversationId, setActiveConversationId } = useActiveConversationStore();
  
  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleSendMessage = async(text: string, attachments: MediaAttachment[]) => {
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      console.log("createConversation", buildNewConversationParams);
      const newConversation = await createConversation(buildNewConversationParams);
      currentConversationId = newConversation.conversationId;
    }
    console.log("sendMessage", text, currentConversationId);
    if (currentConversationId) {
      const params = buildMessageParams(currentConversationId, text, attachments);
      console.log("sendMessage params:", params);
      sendMessage(currentConversationId, params.items);
    }
  };

  const handleCreateConversation = async() => {
    await createConversation(buildNewConversationParams)
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-col border-r">
        <div className="p-2">
          <Button
            onClick={handleCreateConversation}
            className="w-full"
          >
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
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length > 0 ? (
            <MessageList messages={messages} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Start a new conversation
            </div>
          )}

          {/* reasoning */}
          {sections.length > 0 && <ReasoningPanel sections={sections} />}

          {/* Approval - only show pending 的 */}
          {requests.map((req) => (
            <ApprovalCard
              key={req.id}
              request={req}
              onApprove={() => approve(req.id)}
              onReject={() => reject(req.id)}
            />
          ))}

          {/* tool call status - only show running */}
          {toolCalls.length > 0 && <ToolCallStatus calls={toolCalls} />}

          {/* Diff view and undo */}
          {diffs.map((diff) => (
            <DiffViewer key={diff.turnId} unifiedDiff={diff.unifiedDiff} />
          ))}
          {canUndo && <Button onClick={undo}>undo last change</Button>}
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
