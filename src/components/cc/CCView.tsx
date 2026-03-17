import { useEffect, useMemo, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useCCSessionListener, useCCPermissionListener } from './hooks';

import { useCCStore } from '@/stores/cc';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ccGetSessionFilePath, ccResumeSession } from '@/services/tauri/cc';
import { readTextFileLines } from '@/services/tauri/filesystem';
import { parseSessionJsonl } from './utils/parseSessionJsonl';

import { CCMessage } from '@/components/cc/messages';
import { CCInput } from '@/components/cc/composer';
import { CCScrollControls } from '@/components/cc/CCScrollControls';
import { buildMessageGroups, CCExploredMessageGroup } from './messages/group';
import { buildInlineErrorsMap } from './messages/inlineErrors';
import type { CCMessage as CCMessageType } from './types/messages';

interface CCViewProps {
  /** When provided, renders in embedded (grid-card) mode for this specific session. */
  sessionId?: string;
}

export default function CCView({ sessionId }: CCViewProps = {}) {
  const isEmbedded = !!sessionId;

  const {
    activeSessionId,
    activeSessionIds,
    addActiveSessionId,
    messages: globalMessages,
    sessionMessagesMap,
    sessionLoadingMap,
    isLoading: globalIsLoading,
    setLoading,
    setConnected,
    clearMessages,
    options,
    addMessageToSession,
  } = useCCStore();
  const { cwd } = useWorkspaceStore();

  // In embedded mode use per-session data; otherwise use the global active-session data.
  const messages = isEmbedded ? (sessionMessagesMap[sessionId!] ?? []) : globalMessages;
  const isLoading = isEmbedded ? (sessionLoadingMap[sessionId!] ?? false) : globalIsLoading;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  // Reset transient UI state when directory changes (standalone mode only).
  useEffect(() => {
    if (isEmbedded || !cwd || activeSessionId) return;
    clearMessages();
    setConnected(false);
    setLoading(false);
  }, [cwd, activeSessionId, clearMessages, setConnected, setLoading, isEmbedded]);

  // Auto-resume when entering full-screen for a session not yet active (standalone only).
  useEffect(() => {
    if (isEmbedded) return;
    if (!activeSessionId || activeSessionIds.includes(activeSessionId) || !cwd) return;
    const sid = activeSessionId;
    void (async () => {
      const filePath = await ccGetSessionFilePath(sid);
      if (filePath) {
        const lines = await readTextFileLines(filePath);
        for (const msg of parseSessionJsonl(lines, sid)) {
          addMessageToSession(sid, msg);
        }
      }
      await ccResumeSession(sid, {
        cwd,
        permissionMode: options.permissionMode,
        resume: sid,
        continueConversation: true,
        ...(options.model ? { model: options.model } : {}),
      });
      addActiveSessionId(sid);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, isEmbedded]);

  // Per-session message listener for embedded mode — replaces useCCCardListener.
  useEffect(() => {
    if (!isEmbedded || !sessionId) return;
    const unlistenPromise = listen<CCMessageType>('cc-message', (event) => {
      const message = event.payload;
      const msgSessionId = (message as CCMessageType & { session_id?: string }).session_id;
      if (!msgSessionId || msgSessionId !== sessionId) return;
      addMessageToSession(sessionId, message);
    });
    return () => { void unlistenPromise.then((fn) => fn()); };
  }, [sessionId, isEmbedded, addMessageToSession]);

  // Track user scroll intent.
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

  // Smooth-scroll to bottom when messages update.
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    isProgrammaticScrollRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    const timer = setTimeout(() => {
      isProgrammaticScrollRef.current = false;
      if (el) {
        shouldAutoScrollRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const inlineErrorsMap = useMemo(
    () => buildInlineErrorsMap(messages),
    [messages],
  );

  const messageGroups = useMemo(
    () => buildMessageGroups(messages),
    [messages],
  );

  const hasPendingPermission = useMemo(
    () => messages.some((m) => m.type === 'permission_request' && !m.resolved),
    [messages],
  );

  // Global active-session listeners (disabled in embedded mode to avoid double-listening).
  useCCSessionListener(isEmbedded);
  useCCPermissionListener(isEmbedded);

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

        {!isEmbedded && messages.length > 0 && (
          <CCScrollControls scrollContainerRef={scrollContainerRef} />
        )}
      </div>

      {!isEmbedded && !hasPendingPermission && <CCInput />}
    </div>
  );
}
