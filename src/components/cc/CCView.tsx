import { useEffect, useMemo, useRef } from 'react';
import { useCCSessionListener, useCCPermissionListener } from './hooks';

import { useCCStore } from '@/stores/ccStore';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ccResumeSession } from '@/services/tauri/cc';

import { CCMessage } from '@/components/cc/messages';
import { CCInput } from '@/components/cc/composer';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { buildMessageGroups, CCExploredMessageGroup } from './messages/group';
import { buildInlineErrorsMap } from './messages/inlineErrors';

export default function CCView() {
  const {
    activeSessionId,
    activeSessionIds,
    addActiveSessionId,
    messages,
    isLoading,
    setLoading,
    setConnected,
    clearMessages,
    options,
  } = useCCStore();
  const { cwd } = useWorkspaceStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Whether the user wants auto-scroll (true when near bottom).
  const shouldAutoScrollRef = useRef(true);
  // True while a programmatic smooth scroll is animating — prevents the scroll
  // event from incorrectly flipping shouldAutoScrollRef to false mid-animation.
  const isProgrammaticScrollRef = useRef(false);

  // Reset transient UI state when directory changes, but keep selected session.
  useEffect(() => {
    if (!cwd || activeSessionId) return;
    clearMessages();
    setConnected(false);
    setLoading(false);
  }, [cwd, activeSessionId, clearMessages, setConnected, setLoading]);

  // Auto-resume when entering full-screen for a session not yet active.
  useEffect(() => {
    if (!activeSessionId || activeSessionIds.includes(activeSessionId) || !cwd) return;
    void ccResumeSession(activeSessionId, {
      cwd,
      permissionMode: options.permissionMode,
      resume: activeSessionId,
      continueConversation: true,
      ...(options.model ? { model: options.model } : {}),
    }).then(() => addActiveSessionId(activeSessionId));
  }, [activeSessionId]);

  // Track user scroll intent — ignore events caused by our own programmatic scrolls.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Smooth-scroll to bottom when messages update, if the user is near the bottom.
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    // After the smooth animation finishes, re-evaluate position and release the lock.
    const timer = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      if (el) {
        shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

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

  // Bind Tauri message stream and permission listeners.
  useCCSessionListener();
  useCCPermissionListener();

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-4xl mx-auto">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:display-none"
        >
          <div className="flex flex-col gap-2 p-4">

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
              <div className="text-xs text-muted-foreground animate-pulse">Thinking</div>
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
