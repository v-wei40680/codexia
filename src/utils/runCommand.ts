import { invoke } from "@/lib/tauri-proxy";

export const runCommand = async (conversationId: string, cwd: string) => {
  const cmd = `cd ${cwd} && codex resume ${conversationId}`;
  try {
    await invoke("open_terminal_with_command", { command: cmd });
  } catch (err) {
    console.error("Failed to open terminal:", err);
  }
};
