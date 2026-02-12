import { useState } from 'react';
import { InputArea } from './InputArea';
import {
  AccessModePopover,
  ModelReasonSelector,
  AttachmentSelector,
  SkillsPopover,
  SlashCommandsSelector,
} from './selector';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Monitor, Settings, Split } from 'lucide-react';
import { useLayoutStore } from '@/stores';
import { useConfigStore, type ThreadCwdMode } from '@/stores/codex';

interface ComposerProps {
  currentThreadId: string | null;
  currentTurnId: string | null;
  isProcessing: boolean;
  inputFocusTrigger?: number;
  onSend: (message: string, images: string[]) => Promise<void>;
  onStop: () => Promise<void>;
}

export function Composer({
  currentThreadId,
  currentTurnId,
  isProcessing,
  inputFocusTrigger,
  onSend,
  onStop,
}: ComposerProps) {
  const [images, setImages] = useState<string[]>([]);
  const { isConfigLess, setIsConfigLess } = useLayoutStore();
  const { threadCwdMode, setThreadCwdMode } = useConfigStore();

  const handleSend = async (message: string) => {
    await onSend(message, images);
    setImages([]);
  };

  return (
    <div className="space-y-2">
      <InputArea
        currentThreadId={currentThreadId}
        currentTurnId={currentTurnId}
        isProcessing={isProcessing}
        inputFocusTrigger={inputFocusTrigger}
        images={images}
        onRemoveImage={(index) => setImages((prev) => prev.filter((_, i) => i !== index))}
        onSend={handleSend}
        onStop={onStop}
      >
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            setIsConfigLess(!isConfigLess);
          }}
        >
          <Settings />
        </Button>
        {isConfigLess ? null : (
          <>
            <AttachmentSelector
              onImagesSelected={(paths) => setImages((prev) => [...prev, ...paths])}
            />
            <SlashCommandsSelector currentThreadId={currentThreadId} />
            <SkillsPopover />
          </>
        )}
        <AccessModePopover />
        <ModelReasonSelector />
      </InputArea>

      <div className="flex items-center pl-4">
        <Select
          value={threadCwdMode}
          onValueChange={(value) => setThreadCwdMode(value as ThreadCwdMode)}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">
              <span className="inline-flex items-center gap-2">
                <Monitor className="size-4" />
                <span>local</span>
              </span>
            </SelectItem>
            <SelectItem value="worktree">
              <span className="inline-flex items-center gap-2">
                <Split className="size-4" />
                <span>worktree</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
