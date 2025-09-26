import { generateUniqueId } from "@/utils/genUniqueId";
import type { ChatMessage } from "@/types/chat";
import type { CodexEventHandler } from "./types";

const handleExecCommandBegin: CodexEventHandler = (event, context) => {
  if (event.msg.type !== "exec_command_begin") {
    return;
  }
  const {
    sessionId,
    addMessageToStore,
    currentCommandMessageId,
    currentCommandInfo,
  } = context;

  const cmdMessageId = `${sessionId}-cmd-${generateUniqueId()}`;
  const commandArr = event.msg.command;
  const commandStr = commandArr.join(" ");
  currentCommandMessageId.current = cmdMessageId;
  currentCommandInfo.current = { command: commandArr, cwd: event.msg.cwd };

  const commandMessage: ChatMessage = {
    id: cmdMessageId,
    role: "system",
    title: `▶ ${commandStr}`,
    content: `cwd: ${event.msg.cwd}`,
    timestamp: new Date().getTime(),
    messageType: "exec_command",
    eventType: event.msg.type,
  };
  addMessageToStore(commandMessage);
};

const handleExecCommandEnd: CodexEventHandler = (event, context) => {
  if (event.msg.type !== "exec_command_end") {
    return;
  }
  const { sessionId, currentCommandMessageId, currentCommandInfo, updateMessage } = context;
  const messageId = currentCommandMessageId.current;
  const info = currentCommandInfo.current;
  if (!messageId || !info) {
    return;
  }

  const command = info.command.join(" ");
  const status = event.msg.exit_code === 0 ? "✅" : "❌";
  const statusText = event.msg.exit_code === 0 ? "" : ` (exit ${event.msg.exit_code})`;
  const stdoutBlock = event.msg.stdout?.trim() ? `\n\`\`\`\n${event.msg.stdout}\n\`\`\`` : "";
  const stderrBlock = event.msg.stderr?.trim()
    ? `${event.msg.stdout?.trim() ? "\n\n" : ""}Errors:\n\`\`\`\n${event.msg.stderr}\n\`\`\``
    : "";
  const outputContent = `${stdoutBlock}${stderrBlock}`;

  updateMessage(sessionId, messageId, {
    title: `${command} ${status}${statusText}`,
    content: outputContent,
    timestamp: new Date().getTime(),
  });

  currentCommandMessageId.current = null;
  currentCommandInfo.current = null;
};

const noopHandler: CodexEventHandler = () => {};

export const commandHandlers: Record<string, CodexEventHandler> = {
  exec_command_begin: handleExecCommandBegin,
  exec_command_output_delta: noopHandler,
  exec_command_end: handleExecCommandEnd,
};
