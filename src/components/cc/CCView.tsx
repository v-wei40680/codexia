import { useEffect, useMemo, useRef, useState } from 'react';
import { gitBranchInfo, type GitBranchInfoResponse } from '@/services/tauri/git';
import { BranchSwitcher } from './BranchSwitcher';
import { useCCSessionListener, useCCPermissionListener } from './hooks';
import { Card } from '@/components/ui/card';

import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCCInputStore } from '@/stores/useCCInputStore';

import { CCMessage } from '@/components/cc/messages';
import { CCInput } from '@/components/cc/composer';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { ProjectSelector } from '../project-selector';
import { ExamplePrompts } from '@/components/cc/ExamplePrompts';
import { buildMessageGroups, CCExploredMessageGroup } from './messages/group';
import { buildInlineErrorsMap } from './messages/inlineErrors';


export default function CCView() {
  const {
    activeSessionId,
    messages,
    isLoading,
    setLoading,
    setConnected,
    clearMessages,
  } = useCCStore();
  const { cwd } = useWorkspaceStore();
  const { setInputValue: setInput } = useCCInputStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPromptsExpanded, setIsPromptsExpanded] = useState(false);
  const [branchInfo, setBranchInfo] = useState<GitBranchInfoResponse | null>(null);

  const shouldShowWelcome = messages.length === 0 && !activeSessionId;

  // Reset transient UI state when directory changes, but keep selected session.
  useEffect(() => {
    if (!cwd || activeSessionId) return;
    clearMessages();
    setConnected(false);
    setLoading(false);
  }, [cwd, activeSessionId, clearMessages, setConnected, setLoading]);

  // Fetch git branch info whenever cwd changes.
  useEffect(() => {
    if (!cwd) {
      setBranchInfo(null);
      return;
    }
    gitBranchInfo(cwd)
      .then(setBranchInfo)
      .catch(() => setBranchInfo(null));
  }, [cwd]);

  function refreshBranchInfo() {
    if (!cwd) return;
    gitBranchInfo(cwd)
      .then(setBranchInfo)
      .catch(() => setBranchInfo(null));
  }

  // Bind Tauri message stream and permission listeners.
  useCCSessionListener();
  useCCPermissionListener();

  // Pre-compute inline errors map to avoid recalculating inside the render loop.
  const inlineErrorsMap = useMemo(
    () => buildInlineErrorsMap(messages),
    [messages],
  );

  // Group messages: consecutive silent-only assistant messages → single ExploredGroup.
  const messageGroups = useMemo(
    () => buildMessageGroups(messages),
    [messages],
  );

  // Hide the input while a permission card is waiting for a decision.
  const hasPendingPermission = useMemo(
    () => messages.some((m) => m.type === 'permission_request' && !m.resolved),
    [messages],
  );

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none"
        >
          <div className="flex flex-col gap-2 p-4">

            {/* Welcome / empty state */}
            {shouldShowWelcome && (
              <div
                className={`flex-1 flex flex-col items-center max-w-2xl mx-auto py-8 text-center animate-in fade-in duration-500 ${isPromptsExpanded ? 'justify-start mt-4' : 'justify-center'
                  }`}
              >
                {!isPromptsExpanded && (
                  <>
                    <div className="mb-4 space-y-3 animate-in fade-in zoom-in-95 duration-500">
                      <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
                        let&apos;s build
                      </h1>
                    </div>
                    <div className="flex justify-center mb-12 animate-in fade-in zoom-in-95 duration-500">
                      <ProjectSelector
                        variant="hero"
                        className="h-11 max-w-64 gap-2 px-4 bg-background hover:bg-accent shadow-sm border-none transition-all rounded-xl font-medium"
                        triggerMode="project-name"
                        showChevron
                      />
                    </div>
                  </>
                )}
                <div className="w-full">
                  <ExamplePrompts
                    onSelectPrompt={setInput}
                    isExpanded={isPromptsExpanded}
                    onToggleExpanded={() => setIsPromptsExpanded((v) => !v)}
                  />
                </div>
              </div>
            )}

            {/* Message list */}
            {messageGroups.map((group) =>
              group.kind === 'explored' ? (
                <CCExploredMessageGroup
                  key={`explored-${group.msgIndices[0]}`}
                  msgIndices={group.msgIndices}
                  messages={messages}
                  inlineErrorsMap={inlineErrorsMap}
                />
              ) : (
                <CCMessage
                  key={group.msgIdx}
                  message={messages[group.msgIdx]}
                  index={group.msgIdx}
                  inlineErrors={inlineErrorsMap[group.msgIdx]}
                />
              )
            )}

            {/* Loading indicator */}
            {isLoading && (
              <Card className="p-3 bg-gray-50 dark:bg-gray-900">
                <div className="text-xs text-muted-foreground animate-pulse">Thinking</div>
              </Card>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <CCScrollControls scrollContainerRef={scrollContainerRef} />
        )}
      </div>

      {!hasPendingPermission && <CCInput />}

      {branchInfo && (
        <div className="px-4 pb-2">
          <BranchSwitcher
            cwd={cwd}
            branchInfo={branchInfo}
            onBranchChanged={refreshBranchInfo}
          />
        </div>
      )}
    </div>
  );
}
