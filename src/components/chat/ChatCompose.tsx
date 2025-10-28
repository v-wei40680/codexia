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
  disabled: boolean;
}

export function ChatCompose({
  inputValue,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  disabled,
}: ChatComposeProps) {
  return (
    <div className="border-t bg-background p-4">
      <ChatInput
        inputValue={inputValue}
        onInputChange={onInputChange}
        onSendMessage={onSendMessage}
        onStopStreaming={onStopStreaming}
        disabled={disabled}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Sandbox />
        <ProviderModels />
        <ReasoningEffortSelector />
      </div>
    </div>
  );
}
