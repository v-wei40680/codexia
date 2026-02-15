import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { ClaudeCodeMcpServer } from '@/types/cc/cc-mcp';
import { toast } from 'sonner';
import { McpServerCard } from '@/components/cc/mcp/McpServerCard';
import { McpAddServerForm } from '@/components/cc/mcp/McpAddServerForm';
import { McpProjectSelector } from '@/components/cc/mcp/McpProjectSelector';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { ccMcpList } from '@/services';

export default function CCMcpView() {
  const { cwd } = useWorkspaceStore();
  const [servers, setServers] = useState<ClaudeCodeMcpServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('configured');

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
  }, [fetchServers]);

  const handleServerAdded = () => {
    setActiveTab('configured');
    fetchServers();
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Claude Code MCP Servers</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={fetchServers}
            disabled={isLoading || !workingDir}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <McpProjectSelector onProjectChange={fetchServers} disabled={isLoading} />
      </div>

      {!workingDir ? (
        <Card className="p-8 text-center flex-1 flex flex-col justify-center items-center">
          <p className="text-muted-foreground mb-4">No working directory selected</p>
          <p className="text-xs text-muted-foreground">Please select a project directory first.</p>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="configured">Configured Servers</TabsTrigger>
            <TabsTrigger value="add">
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configured" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-2">
              {servers.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No MCP servers configured</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab('add')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first server
                  </Button>
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
          </TabsContent>

          <TabsContent value="add" className="flex-1 overflow-y-auto mt-4">
            <McpAddServerForm
              workingDir={workingDir}
              existingServers={servers}
              onServerAdded={handleServerAdded}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
