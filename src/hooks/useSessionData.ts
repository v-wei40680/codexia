import { useState, useEffect, useMemo } from "react";
import { readTextFileLines, BaseDirectory } from "@tauri-apps/plugin-fs";
import type { ReviewMessage } from "@/types/review";
import { ConversationSummary } from "@/bindings/ConversationSummary";

interface SessionData {
  instructions: string;
  cwd: string;
  totalTokens: number;
  messages: ReviewMessage[];
}

function normalizeContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/* Helpers for parsing */
function parseEventMessage(
  payload: any,
  parsedMessages: ReviewMessage[],
  nextIndex: () => number,
  setTokenTotal: (value: number) => void,
): void {
  switch (payload.type) {
    case "token_count": {
      const total = payload?.info?.total_token_usage?.total_tokens;
      if (typeof total === "number") {
        setTokenTotal(total);
      }
      break;
    }
    case "agent_reasoning": {
      const content = normalizeContent(payload.text);
      if (content) {
        parsedMessages.push({
          id: `agent_reasoning-${nextIndex()}`,
          type: payload.type,
          content,
          variant: "reasoning",
        });
      }
      break;
    }
    case "agent_reasoning_raw_content":
    case "agent_message": {
      const content = normalizeContent(payload.message ?? payload.text);
      if (content) {
        parsedMessages.push({
          id: `agent_message-${nextIndex()}`,
          type: payload.type,
          content,
          variant: "response",
        });
      }
      break;
    }
    case "user_message": {
      const content = normalizeContent(payload.message);
      if (content) {
        parsedMessages.push({
          id: `user_message-${nextIndex()}`,
          role: "user",
          type: payload.type,
          content,
        });
      }
      break;
    }
  }
}

function parseResponseItem(
  payload: any,
  parsedMessages: ReviewMessage[],
  nextIndex: () => number,
): void {
  switch (payload.type) {
    case "function_call": {
      const args = JSON.parse(payload.arguments);
      try {
        const content = normalizeContent(args.command.join(" "));
        if (content) {
          let formattedContent = content;
          if (content.includes("apply_patch")) {
            const updateFileMatch = content.match(/\*\*\* Update File: (.*)/);
            const filename = updateFileMatch
              ? updateFileMatch[1]
              : "Unknown File";
            formattedContent = `<details><summary>Update File: ${filename}</summary>\n\n<pre><code>${content}</code></pre>\n</details>`;
          }
          parsedMessages.push({
            id: `function_call_command-${nextIndex()}`,
            type: payload.type,
            content: formattedContent,
            variant: "reasoning",
          });
        }
      } catch {
        const rawPlan = args && args.plan ? args.plan : undefined;
        let planData: any = undefined;
        if (Array.isArray(rawPlan)) {
          planData = rawPlan;
        } else if (typeof rawPlan === "string") {
          try {
            const parsed = JSON.parse(rawPlan);
            if (Array.isArray(parsed)) planData = parsed;
            else if (parsed && Array.isArray(parsed.plan))
              planData = parsed.plan;
          } catch {}
        } else if (
          rawPlan &&
          typeof rawPlan === "object" &&
          Array.isArray(rawPlan.plan)
        ) {
          planData = rawPlan.plan;
        }
        if (planData && Array.isArray(planData) && planData.length > 0) {
          parsedMessages.push({
            id: `function_call_plan-${nextIndex()}`,
            type: payload.type,
            plan: planData,
            variant: "plan",
          });
        }
      }
      break;
    }
    case "function_call_output": {
      let content = "";
      try {
        const call_output_obj = JSON.parse(payload.output || "{}");
        content = call_output_obj.output;
      } catch {
        content = payload.output || "";
      }
      if (content) {
        parsedMessages.push({
          id: `function_call_output-${nextIndex()}`,
          type: payload.type,
          content,
          title: "function_call_output",
          variant: "reasoning",
        });
      }
      break;
    }
  }
}

export function useSessionData(summary: ConversationSummary | null) {
  const [instructions, setInstructions] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [cwd, setCwd] = useState("");
  const [totalTokens, setTotalTokens] = useState(0);
  const [messages, setMessages] = useState<ReviewMessage[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionCache, setSessionCache] = useState<Record<string, SessionData>>(
    {},
  );

  const hasMessages = useMemo(() => messages.length > 0, [messages]);
  const hasSelection = useMemo(() => Boolean(summary), [summary]);
  let activeRequestId = 0;

  const resetSessionView = () => {
    setInstructions("");
    setCwd("");
    setTotalTokens(0);
    setMessages([]);
  };

  const applySessionData = (data: SessionData | null) => {
    if (!data) {
      resetSessionView();
      return;
    }
    setInstructions(data.instructions);
    setCwd(data.cwd);
    setTotalTokens(data.totalTokens);
    setMessages(() => data.messages);
  };

  const loadSession = async (
    _summary: ConversationSummary,
    options: { force?: boolean } = {},
  ) => {
    const { conversationId, path } = _summary;
    setSessionId(conversationId);
    const { force = false } = options;
    const cachedSession = sessionCache[conversationId];
    if (cachedSession && !force) {
      applySessionData(cachedSession);
      setSessionError(null);
      setIsSessionLoading(false);
      return;
    }
    const requestId = ++activeRequestId;
    setIsSessionLoading(true);
    setSessionError(null);
    resetSessionView();
    try {
      const lines = await readTextFileLines(path, {
        baseDir: BaseDirectory.Home,
      });
      const parsedMessages: ReviewMessage[] = [];
      let counter = 0;
      const nextIndex = () => counter++;
      let nextInstructions = "";
      let nextCwd = "";
      let nextTotalTokens = 0;
      const recordTotalTokens = (value: number) => {
        nextTotalTokens = value;
      };
      for await (const line of lines) {
        if (!line) continue;
        const cleanedLine = line.replace(/\0/g, "");
        if (!cleanedLine.trim()) continue;
        const parsed = JSON.parse(cleanedLine);
        if (!parsed) continue;
        const payload = parsed?.payload ?? {};
        switch (parsed.type) {
          case "session_meta":
            if (typeof payload.instructions === "string") {
              nextInstructions = payload.instructions;
            }
            if (typeof payload.cwd === "string") {
              nextCwd = payload.cwd;
            }
            break;
          case "event_msg":
            parseEventMessage(
              payload,
              parsedMessages,
              nextIndex,
              recordTotalTokens,
            );
            break;
          case "response_item":
            parseResponseItem(payload, parsedMessages, nextIndex);
            break;
          default:
            break;
        }
      }
      const sessionData: SessionData = {
        instructions: nextInstructions,
        cwd: nextCwd,
        totalTokens: nextTotalTokens,
        messages: parsedMessages,
      };
      if (requestId !== activeRequestId) return;
      applySessionData(sessionData);
      setSessionCache((prev) => ({ ...prev, [conversationId]: sessionData }));
    } catch (fsError) {
      console.error("Failed to read session file", fsError);
      if (requestId !== activeRequestId) return;
      applySessionData(null);
      setSessionError(
        "Unable to read the session file. Please confirm the path and try again.",
      );
    } finally {
      if (requestId === activeRequestId) {
        setIsSessionLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    if (summary) {
      void loadSession(summary, { force: true });
    }
  };

  useEffect(() => {
    if (!summary) {
      setSessionError(null);
      setIsSessionLoading(false);
      resetSessionView();
      return;
    }
    void loadSession(summary);
  }, [summary]);

  return {
    sessionId,
    cwd,
    instructions,
    totalTokens,
    messages,
    isSessionLoading,
    sessionError,
    hasMessages,
    hasSelection,
    refresh: handleRefresh,
  };
}
