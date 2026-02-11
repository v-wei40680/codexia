import { Button } from '@/components/ui/button';

export function McpLinkerButton() {
  return (
    <Button
      onClick={() => {
        const url = 'https://github.com/milisp/mcp-linker';
        window.open(url, '_blank', 'noopener,noreferrer');
      }}
    >
      Go to download MCP Linker to manage mcp
    </Button>
  );
}
