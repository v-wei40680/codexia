import { useState } from 'react';
import { InputArea } from './InputArea';
import {
  AccessModePopover,
  ModelReasonSelector,
  AttachmentSelector,
} from './selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Monitor, Split } from 'lucide-react';
import { useInputStore } from '@/stores/useInputStore';
import { useConfigStore, type ThreadCwdMode } from '@/stores/codex';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { appendFileLinks } = useInputStore();
  const isMobile = useIsMobile();
  const { threadCwdMode, setThreadCwdMode } =
    useConfigStore();

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
        <AttachmentSelector
          onImagesSelected={(paths) => setImages((prev) => [...prev, ...paths])}
          onFilesSelected={(paths) => appendFileLinks(paths)}
        />
        <ModelReasonSelector />
      </InputArea>

      <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap px-2 pb-1' : 'pl-4'}`}>
        <Select
          value={threadCwdMode}
          onValueChange={(value) => setThreadCwdMode(value as ThreadCwdMode)}
        >
          <SelectTrigger className='w-fit'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">
              <span className="inline-flex items-center gap-2">
                <Monitor className="size-4" />
                <span>Local</span>
              </span>
            </SelectItem>
            <SelectItem value="worktree">
              <span className="inline-flex items-center gap-2">
                <Split className="size-4" />
                <span>Worktree</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <AccessModePopover />
      </div>
    </div>
  );
}
