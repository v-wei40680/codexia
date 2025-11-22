import { isRemoteRuntime } from "@/lib/tauri-proxy";
import { open as openUrl } from "@tauri-apps/plugin-shell"
import { Button } from "../ui/button";

export function McpLinkerButton() {
    return (
<Button
onClick={() => {
  const url = 'https://github.com/milisp/mcp-linker';
  if (isRemoteRuntime()) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    openUrl(url)
  }
}}
>
Go to download MCP Linker to manage mcp
</Button>
    )
}