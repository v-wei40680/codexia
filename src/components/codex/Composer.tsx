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
import { useConfigStore, useCodexStore, type ThreadCwdMode } from '@/stores/codex';
import { useAgentCenterStore } from '@/stores';
import { useIsMobile } from '@/hooks/use-mobile';
import { codexService } from '@/services/codexService';
import { toast } from '@/components/ui/use-toast';
import { getErrorMessage } from '@/utils/errorUtils';

export function Composer() {
  const [images, setImages] = useState<string[]>([]);
  const { appendFileLinks } = useInputStore();
  const isMobile = useIsMobile();
  const { threadCwdMode, setThreadCwdMode } = useConfigStore();
  const { currentThreadId, currentTurnId } = useCodexStore();
  const { addAgentCard, setCurrentAgentCardId } = useAgentCenterStore();

  const handleSend = async (message: string) => {
    let targetThreadId = currentThreadId;
    if (!targetThreadId) {
      try {
        const thread = await codexService.threadStart();
        targetThreadId = thread.id;
      } catch (error) {
        console.error('Failed to start thread:', error);
        toast.error('Failed to start thread', {
          description: getErrorMessage(error),
        });
        return;
      }
    }
    addAgentCard({ kind: 'codex', id: targetThreadId, preview: message });
    setCurrentAgentCardId(targetThreadId);
    try {
      await codexService.turnStart(targetThreadId, message, images);
      setImages([]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message', {
        description: getErrorMessage(error),
      });
    }
  };

  const handleStop = async () => {
    if (!currentThreadId || !currentTurnId) return;
    await codexService.turnInterrupt(currentThreadId, currentTurnId);
  };

  return (
    <div className="space-y-2">
      <InputArea
        images={images}
        onRemoveImage={(index) => setImages((prev) => prev.filter((_, i) => i !== index))}
        onSend={handleSend}
        onStop={handleStop}
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
