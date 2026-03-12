import { useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Card } from '@/components/ui/card';

import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useCCInputStore } from '@/stores/useCCInputStore';

import type {
  AssistantMessage,
  CCMessage as CCMessageType,
  ContentBlock,
  ToolResultBlock,
  ToolUseBlock,
} from './types/messages';
import { isToolResultBlock } from './types/messages';
import { CCMessage } from '@/components/cc/messages';
import { ExploredGroup } from '@/components/cc/messages/ExploredGroup';
import { CCInput } from '@/components/cc/composer';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { ProjectSelector } from '../project-selector';
import { ExamplePrompts } from '@/components/cc/ExamplePrompts';

const CC_LISTENER_READY_EVENT = 'cc-session-listener-ready';
const CC_PERMISSION_LISTENER_READY_EVENT = 'cc-permission-listener-ready';

const SILENT_TOOLS = new Set(['Read', 'Glob', 'Grep']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the assistant message contains only SILENT_TOOL tool_uses
 * (Read/Grep/Glob) and no non-empty text blocks. These are grouped across
 * consecutive messages into a single ExploredGroup.
 */
function isSilentOnlyMessage(msg: CCMessageType): msg is AssistantMessage {
  if (msg.type !== 'assistant') return false;
  const blocks = msg.message.content;
  const toolUses = blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');
  if (toolUses.length === 0) return false;
  const hasNonSilent = toolUses.some((b) => !SILENT_TOOLS.has(b.name));
  const hasText = blocks.some((b) => b.type === 'text' && (b as { text: string }).text.trim().length > 0);
  return !hasNonSilent && !hasText;
}

/**
 * Collect tool_result errors from a user message that immediately follows an
 * assistant message, so they can be rendered inline in the assistant's tool badges.
 */
function collectInlineErrors(
  messages: CCMessageType[],
  idx: number,
): Record<string, ToolResultBlock> | undefined {
  const msg = messages[idx];
  if (msg.type !== 'assistant') return undefined;

  // Find the next user message, skipping stream_events / system messages in between.
  let nextIdx = idx + 1;
  while (nextIdx < messages.length && messages[nextIdx].type !== 'user' && messages[nextIdx].type !== 'assistant') {
    nextIdx++;
  }
  const next = messages[nextIdx];
  if (!next || next.type !== 'user') return undefined;

  const blocks: ContentBlock[] = next.content ?? [];

  // Return undefined if no tool_result blocks in next user message (tools still in progress).
  const hasToolResults = blocks.some((b) => isToolResultBlock(b) && b.tool_use_id);
  if (!hasToolResults) return undefined;

  const errors: Record<string, ToolResultBlock> = {};
  for (const b of blocks) {
    if (isToolResultBlock(b) && b.is_error && b.tool_use_id) {
      errors[b.tool_use_id] = b;
    }
  }
  // Return {} (possibly empty) to signal message is completed even if no errors.
  return errors;
}

/**
 * Returns true if the user message should be hidden from the message list.
 * Pure tool_result error messages are rendered inline in the preceding assistant message.
 */
function shouldSkipUserMessage(msg: CCMessageType): boolean {
  if (msg.type !== 'user') return false;
  if (msg.text) return false;

  const blocks: ContentBlock[] = msg.content ?? [];
  return blocks.length > 0 && blocks.every((b) => isToolResultBlock(b) && b.is_error);
}

// ---------------------------------------------------------------------------
// Message grouping
// ---------------------------------------------------------------------------

type MessageGroup =
  | { kind: 'message'; msgIdx: number }
  | { kind: 'explored'; msgIndices: number[] };

/**
 * Group consecutive silent-only assistant messages (Read/Grep/Glob only) into
 * ExploredGroup entries. Pure tool_result user messages between them are
 * transparent to the grouping logic.
 */
function buildMessageGroups(messages: CCMessageType[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (isSilentOnlyMessage(msg)) {
      const msgIndices: number[] = [];

      while (i < messages.length) {
        const m = messages[i];
        const mType = m.type;
        if (isSilentOnlyMessage(m)) {
          msgIndices.push(i);
          i++;
        } else if (
          mType === 'assistant' ||            // non-silent assistant
          (mType === 'user' && !!(m as { text?: string }).text) ||  // user typed something
          mType === 'result'                  // session finished
        ) {
          break;
        } else {
          // Transparent: user tool_results, stream_events, system, etc.
          i++;
        }
      }

      groups.push({ kind: 'explored', msgIndices });
    } else {
      if (!shouldSkipUserMessage(msg)) {
        groups.push({ kind: 'message', msgIdx: i });
      }
      i++;
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// CCExploredMessageGroup
// ---------------------------------------------------------------------------

interface ExploredMessageGroupProps {
  msgIndices: number[];
  messages: CCMessageType[];
  inlineErrorsMap: Record<number, Record<string, ToolResultBlock>>;
}

function CCExploredMessageGroup({ msgIndices, messages, inlineErrorsMap }: ExploredMessageGroupProps) {
  const items = msgIndices.flatMap((idx) => {
    const msg = messages[idx] as AssistantMessage;
    const errors = inlineErrorsMap[idx];
    return msg.message.content
      .filter((b): b is ToolUseBlock => b.type === 'tool_use' && SILENT_TOOLS.has(b.name))
      .map((block) => ({ block, inlineError: errors?.[block.id] ?? null }));
  });

  // Group is completed when every message in the group has received tool_results.
  const isCompleted = msgIndices.every((idx) => inlineErrorsMap[idx] !== undefined);

  return <ExploredGroup items={items} isCompleted={isCompleted} />;
}

// ---------------------------------------------------------------------------
// CCView
// ---------------------------------------------------------------------------

export default function CCView() {
  const {
    activeSessionId,
    messages,
    isLoading,
    addMessage,
    setLoading,
    setConnected,
    clearMessages,
  } = useCCStore();
  const { cwd } = useWorkspaceStore();
  const { setInputValue: setInput } = useCCInputStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPromptsExpanded, setIsPromptsExpanded] = useState(false);

  const shouldShowWelcome = messages.length === 0 && !activeSessionId;

  // Reset transient UI state when directory changes, but keep selected session.
  useEffect(() => {
    if (!cwd || activeSessionId) return;
    clearMessages();
    setConnected(false);
    setLoading(false);
  }, [cwd, activeSessionId, clearMessages, setConnected, setLoading]);

  // Bind Tauri message stream listener for the active session.
  useEffect(() => {
    if (!activeSessionId) return;
    const eventName = `cc-message:${activeSessionId}`;
    console.info('[CCView] Bind message listener', { activeSessionId, eventName });

    const unlistenPromise = listen<CCMessageType>(eventName, (event) => {
      console.info('[CCView] Received message', event);
      const message = event.payload;
      addMessage(message);
      if (message.type === 'result') setLoading(false);
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Message listener ready', { activeSessionId });
      window.dispatchEvent(
        new CustomEvent(CC_LISTENER_READY_EVENT, { detail: { sessionId: activeSessionId } }),
      );
    });

    return () => { void unlistenPromise.then((fn) => fn()); };
  }, [activeSessionId, addMessage, setLoading]);

  // Bind Tauri permission request listener for the active session.
  useEffect(() => {
    if (!activeSessionId) return;
    console.info('[CCView] Bind permission listener', { activeSessionId });

    const unlistenPromise = listen<{
      requestId: string;
      sessionId: string;
      toolName: string;
      toolInput: Record<string, unknown>;
    }>('cc-permission-request', (event) => {
      const { requestId, sessionId, toolName, toolInput } = event.payload;
      if (sessionId !== activeSessionId) {
        console.warn('[CCView] Ignoring permission request for inactive session', {
          activeSessionId,
          requestId,
          sessionId,
        });
        return;
      }
      addMessage({ type: 'permission_request', requestId, sessionId, toolName, toolInput });
    });

    void unlistenPromise.then(() => {
      console.info('[CCView] Permission listener ready', { activeSessionId });
      window.dispatchEvent(
        new CustomEvent(CC_PERMISSION_LISTENER_READY_EVENT, {
          detail: { sessionId: activeSessionId },
        }),
      );
    });

    return () => { void unlistenPromise.then((fn) => fn()); };
  }, [activeSessionId, addMessage]);

  // Pre-compute inline errors map to avoid recalculating inside the render loop.
  const inlineErrorsMap = useMemo(
    () =>
      messages.reduce<Record<number, Record<string, ToolResultBlock>>>((acc, _, idx) => {
        const errors = collectInlineErrors(messages, idx);
        if (errors) acc[idx] = errors;
        return acc;
      }, {}),
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
    </div>
  );
}
