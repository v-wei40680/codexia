import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ClaudeCodeMcpServer } from '@/types/cc/cc-mcp';
import { toast } from 'sonner';
import { McpServerCard } from '@/components/cc/mcp/McpServerCard';
import { McpConfigScopeSelector } from '@/components/cc/mcp/McpConfigScopeSelector';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ccMcpList } from '@/services';

interface CCMcpViewProps {
  refreshKey?: number;
}

export default function CCMcpView({ refreshKey }: CCMcpViewProps) {
  const { cwd } = useWorkspaceStore();
  const [servers, setServers] = useState<ClaudeCodeMcpServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<string>('local');

  const workingDir = cwd || '';

  const fetchServers = useCallback(async () => {
    if (!workingDir) return;
    setIsLoading(true);
    try {
      const list = await ccMcpList<ClaudeCodeMcpServer[]>(workingDir);
      setServers(list);
    } catch (error) {
      toast.error(`Failed to fetch MCP servers: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [workingDir]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers, refreshKey]);

  return (
    <div className="h-full flex flex-col px-4">
      <Button
        size="icon"
        variant="ghost"
        onClick={fetchServers}
        disabled={isLoading || !workingDir}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
      <McpConfigScopeSelector 
        selectedScope={selectedScope} 
        onScopeChange={setSelectedScope} 
        onProjectChange={fetchServers} 
        disabled={isLoading} 
      />

      {!workingDir ? (
        <Card className="p-8 text-center flex-1 flex flex-col justify-center items-center">
          <p className="text-xs text-muted-foreground">Please select a project directory first.</p>
        </Card>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {servers.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No MCP servers configured</p>
              </Card>
            ) : (
              servers.map((server) => (
                <McpServerCard
                  key={server.name}
                  server={server}
                  workingDir={workingDir}
                  onServerUpdated={fetchServers}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
