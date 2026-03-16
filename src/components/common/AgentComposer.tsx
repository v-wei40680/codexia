import { useState, useEffect } from 'react';
import { AgentIcon } from './AgentIcon';
import { CCInput } from '@/components/cc/composer/CCInput';
import { WorkspaceSwitcher } from '@/components/cc/WorkspaceSwitcher';
import { gitBranchInfo, type GitBranchInfoResponse } from '@/services/tauri/git';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCodexStore } from '@/stores/codex';
import { useConfigStore, type ThreadCwdMode } from '@/stores/codex';
import { codexService } from '@/services/codexService';
import { useAgentCenterStore } from '@/stores';
import { useInputStore } from '@/stores/useInputStore';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, CircleStop, Monitor, Split } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AccessModePopover,
  ModelReasonSelector,
  AttachmentSelector,
} from '@/components/codex/selector';
import { useIsMobile } from '@/hooks/use-mobile';

type Agent = 'codex' | 'cc';

interface AgentComposerProps {
  isProcessing: boolean;
  onStop: () => Promise<void>;
}

function CodexComposerInput({ isProcessing, onStop }: AgentComposerProps) {
  const [value, setValue] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const { appendFileLinks } = useInputStore();
  const { threadCwdMode, setThreadCwdMode } = useConfigStore();
  const { currentThreadId, currentTurnId } = useCodexStore();
  const { addAgentCard, setCurrentAgentCardId } = useAgentCenterStore();
  const isMobile = useIsMobile();

  const handleSend = async () => {
    const text = value.trim();
    if (!text || isProcessing) return;
    setValue('');
    setImages([]);

    let targetThreadId = currentThreadId;
    if (!targetThreadId) {
      const thread = await codexService.threadStart();
      targetThreadId = thread.id;
    }
    addAgentCard({ kind: 'codex', id: targetThreadId, preview: text });
    setCurrentAgentCardId(targetThreadId);
    await codexService.turnStart(targetThreadId, text, images);
  };

  const handleStop = async () => {
    if (!currentThreadId || !currentTurnId) return;
    await onStop();
  };

  return (
    <div className="space-y-2 p-2 border-t bg-background">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask Codex to do anything..."
          className="min-h-16 w-full pb-11 pr-2 resize-none"
        />
        <div className="absolute left-1 bottom-1 flex items-center gap-0.5">
          <AttachmentSelector
            onImagesSelected={(paths) => setImages((prev) => [...prev, ...paths])}
            onFilesSelected={(paths) => appendFileLinks(paths)}
          />
          <ModelReasonSelector />
        </div>
        <div className="absolute right-1 bottom-1 flex items-center gap-1.5 px-1 bg-background/50 backdrop-blur-sm rounded-md">
          <Button
            onClick={isProcessing ? handleStop : handleSend}
            size="icon"
            className="h-7 w-7"
            variant={isProcessing ? 'destructive' : 'default'}
            disabled={!value.trim() && !isProcessing}
          >
            {isProcessing
              ? <CircleStop className="h-3.5 w-3.5" />
              : <Send className="h-3.5 w-3.5" />
            }
          </Button>
        </div>
      </div>

      <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap px-2 pb-1' : 'pl-1'}`}>
        <Select
          value={threadCwdMode}
          onValueChange={(v) => setThreadCwdMode(v as ThreadCwdMode)}
        >
          <SelectTrigger className="w-fit">
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

export function AgentComposer({ isProcessing, onStop }: AgentComposerProps) {
  const { cwd, selectedAgent, setSelectedAgent } = useWorkspaceStore();
  const activeAgent = selectedAgent;
  const setActiveAgent = setSelectedAgent;
  const [branchInfo, setBranchInfo] = useState<GitBranchInfoResponse | null>(null);
  const { currentAgentCardId, cards } = useAgentCenterStore();

  // Sync tab to the currently selected card's kind
  useEffect(() => {
    if (!currentAgentCardId) return;
    const card = cards.find((c) => c.id === currentAgentCardId);
    if (card) setActiveAgent(card.kind);
  }, [currentAgentCardId]);

  useEffect(() => {
    if (!cwd) { setBranchInfo(null); return; }
    gitBranchInfo(cwd).then(setBranchInfo).catch(() => setBranchInfo(null));
  }, [cwd]);

  function refreshBranchInfo() {
    if (!cwd) return;
    gitBranchInfo(cwd).then(setBranchInfo).catch(() => setBranchInfo(null));
  }

  return (
    <div className="flex flex-col">
      {/* Agent tabs */}
      <div className="flex items-center gap-1 px-2 pt-1.5 border-t bg-background">
        {(['cc', 'codex'] as Agent[]).map((agent) => (
          <button
            key={agent}
            onClick={() => setActiveAgent(agent)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeAgent === agent
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <AgentIcon agent={agent} />
            <span>{agent === 'cc' ? 'Claude Code' : 'Codex'}</span>
          </button>
        ))}
      </div>

      {/* Composer area */}
      {activeAgent === 'cc' ? (
        <>
          <CCInput />
          {cwd && (
            <div className="px-4 pb-2">
              <WorkspaceSwitcher cwd={cwd} branchInfo={branchInfo} onBranchChanged={refreshBranchInfo} />
            </div>
          )}
        </>
      ) : (
        <CodexComposerInput isProcessing={isProcessing} onStop={onStop} />
      )}
    </div>
  );
}
