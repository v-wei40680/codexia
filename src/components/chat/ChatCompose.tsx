import { ChatInput } from "./ChatInput";
import { Sandbox } from "../config/Sandbox";
import { ProviderModels } from "@/components/config/provider-models";
import { ReasoningEffortSelector } from "../config/ReasoningEffortSelector";
import type { MediaAttachment } from "@/types/chat";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import type { TokenUsage } from "@/bindings/TokenUsage";
import { TokenCountInfo } from "../common/TokenCountInfo";

interface ChatComposeProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string, attachments: MediaAttachment[]) => void;
  onStopStreaming: () => void;
  isBusy: boolean;
  tokenUsage: TokenUsage | null;
}

export function ChatCompose({
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  isBusy,
  tokenUsage,
}: ChatComposeProps) {
  const navigate = useNavigate();
  return (
    <div className="border-t bg-background px-2">
      <ChatInput
        inputValue={inputValue}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        disabled={isBusy}
        isLoading={isBusy}
      />
      <div className="flex flex-wrap items-center justify-between">
        <span className="flex">
          <Sandbox />
          <ProviderModels />
          <ReasoningEffortSelector />
          <TokenCountInfo usage={tokenUsage} />
        </span>
        <Button onClick={() => navigate("/review")}>Review</Button>
      </div>
    </div>
  );
}

