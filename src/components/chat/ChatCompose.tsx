import { ChatInput } from "./ChatInput";
import { Sandbox } from "../config/Sandbox";
import { ProviderModels } from "@/components/config/provider-models";
import { ReasoningEffortSelector } from "../config/ReasoningEffortSelector";
import type { MediaAttachment } from "@/types/chat";

interface ChatComposeProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string, attachments: MediaAttachment[]) => void;
  onStopStreaming: () => void;
  isBusy: boolean;
}

export function ChatCompose({
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  isBusy,
}: ChatComposeProps) {
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
      <div className="flex flex-wrap items-center">
        <Sandbox />
        <ProviderModels />
        <ReasoningEffortSelector />
      </div>
    </div>
  );
}
