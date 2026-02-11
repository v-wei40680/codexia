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
import { Settings } from 'lucide-react';
import { useLayoutStore } from '@/stores';

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

  const handleSend = async (message: string) => {
    await onSend(message, images);
    setImages([]);
  };

  return (
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
  );
}
