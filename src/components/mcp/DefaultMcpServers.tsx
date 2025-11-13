import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { McpServerConfig } from '@/types/codex';
import { invoke } from '@/lib/tauri-proxy';
import { toast } from 'sonner';

interface DefaultMcpServersProps {
  servers: Record<string, McpServerConfig>;
  onServerAdded: () => void;
}

export function DefaultMcpServers({ servers, onServerAdded }: DefaultMcpServersProps) {
  const defaultServers = [
    {
      name: 'desktop-commander',
      description: 'Search, update, manage files and run terminal commands with AI',
      config: {
        type: 'stdio' as const,
        command: 'npx',
        args: ['-y', '@wonderwhy-er/desktop-commander'],
      }
    },
    {
      name: 'deepwiki',
      description: 'DeepWiki automatically generates architecture diagrams, documentation, and links to source code to help you understand unfamiliar codebases quickly.',
      config: {
        type: 'http' as const,
        url: 'https://mcp.deepwiki.com/mcp'
      }
    }
  ];

  const handleAddDefaultServer = async (defaultServer: typeof defaultServers[0]) => {
    try {
      await invoke('add_mcp_server', { name: defaultServer.name, config: defaultServer.config });
      onServerAdded();
    } catch (error) {
      console.error('Failed to add default MCP server:', error);
      toast.error('Failed to add MCP server: ' + error);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Quick Add Servers</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {defaultServers.map((defaultServer) => {
          const isAlreadyAdded = Object.hasOwnProperty.call(servers, defaultServer.name);
          return (
            <Card key={defaultServer.name} className={isAlreadyAdded ? 'opacity-50' : ''}>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-sm">{defaultServer.name}</div>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddDefaultServer(defaultServer)}
                      disabled={isAlreadyAdded}
                    >
                      <Plus className="h-4 w-4" />
                      {isAlreadyAdded ? 'Added' : 'Add'}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">{defaultServer.description}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
