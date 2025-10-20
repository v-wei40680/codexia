import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProviderModels } from "./config/provider-models";
import { Send, Square } from "lucide-react";
import { Sandbox } from "./config/Sandbox";
import { ReasoningEffortSelector } from "./config/ReasoningEffortSelector";

interface ChatComposeProps {
  currentMessage: string;
  setCurrentMessage: (msg: string) => void;
  handleSendMessage: () => void;
  isSending: boolean;
  isInitializing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function ChatCompose({
  currentMessage,
  setCurrentMessage,
  handleSendMessage,
  isSending,
  isInitializing,
  inputRef,
}: ChatComposeProps) {
  return (
    <div className="gap-2">
      <div className="flex items-center space-x-2">
        <Input
          ref={inputRef}
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isSending || isInitializing}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isSending || isInitializing}
        >
          {isSending ? <Square /> : <Send />}
        </Button>
      </div>
      <div>
        <Sandbox />
        <ProviderModels />
        <ReasoningEffortSelector />
      </div>
    </div>
  );
}
