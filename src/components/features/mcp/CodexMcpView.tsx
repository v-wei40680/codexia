import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, X } from 'lucide-react';
import { McpServerConfig } from '@/types';
import { toast } from 'sonner';
import {
  McpServerForm,
  McpLinkerButton,
  DefaultMcpServers,
  McpServerCard,
  getServerProtocol,
} from '@/components/features/mcp';

export function CodexMcpView() {
  const [servers, setServers] = useState<Record<string, McpServerConfig>>({});
  const [activeTab, setActiveTab] = useState('quick');
  const [newServerName, setNewServerName] = useState('');
  const [newServerProtocol, setNewServerProtocol] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [commandConfig, setCommandConfig] = useState({
    command: '',
    args: '',
    env: '',
  });
  const [httpConfig, setHttpConfig] = useState({
    url: '',
  });
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<{
    name: string;
    protocol: 'stdio' | 'http' | 'sse';
    command: { command: string; args: string; env: string };
    http: { url: string };
  } | null>(null);

  const loadServers = async () => {
    try {
      const mcpServers = await invoke<Record<string, McpServerConfig>>('read_mcp_servers');
      setServers(mcpServers);
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleAddServer = async () => {
    if (!newServerName) return;

    try {
      let config: McpServerConfig;

      if (newServerProtocol === 'stdio') {
        config = {
          type: 'stdio',
          command: commandConfig.command,
          args: commandConfig.args.split(' ').filter((arg) => arg.trim()),
        };

        if (commandConfig.env && commandConfig.env.trim()) {
          try {
            config.env = JSON.parse(commandConfig.env);
          } catch (e) {
            toast.error('Invalid JSON format for environment variables');
            return;
          }
        }
      } else {
        config = {
          type: newServerProtocol,
          url: httpConfig.url,
        };
      }

      await invoke('add_mcp_server', { name: newServerName, config });

      setNewServerName('');
      setCommandConfig({ command: '', args: '', env: '' });
      setHttpConfig({ url: '' });
      setActiveTab('configured');
      loadServers();
    } catch (error) {
      console.error('Failed to add MCP server:', error);
      toast.error('Failed to add MCP server: ' + error);
    }
  };

  const handleEditServer = (name: string, config: McpServerConfig) => {
    const protocol = getServerProtocol(config);
    const httpUrl = protocol === 'stdio' ? '' : 'url' in config ? config.url : '';
    setEditingServer(name);
    setEditConfig({
      name,
      protocol,
      command: {
        command: protocol === 'stdio' && 'command' in config ? config.command : '',
        args: protocol === 'stdio' && 'args' in config ? config.args.join(' ') : '',
        env:
          protocol === 'stdio' && 'env' in config && config.env
            ? JSON.stringify(config.env, null, 2)
            : '',
      },
      http: {
        url: httpUrl,
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editConfig || !editingServer) return;

    try {
      let config: McpServerConfig;

      if (editConfig.protocol === 'stdio') {
        config = {
          type: 'stdio',
          command: editConfig.command.command,
          args: editConfig.command.args.split(' ').filter((arg) => arg.trim()),
        };

        if (editConfig.command.env && editConfig.command.env.trim()) {
          try {
            config.env = JSON.parse(editConfig.command.env);
          } catch (e) {
            toast.error('Invalid JSON format for environment variables');
            return;
          }
        }
      } else {
        config = {
          type: editConfig.protocol,
          url: editConfig.http.url,
        };
      }

      await invoke('delete_mcp_server', { name: editingServer });
      await invoke('add_mcp_server', { name: editConfig.name, config });

      setEditingServer(null);
      setEditConfig(null);
      loadServers();
    } catch (error) {
      console.error('Failed to update MCP server:', error);
      toast.error('Failed to update MCP server: ' + error);
    }
  };

  const handleCancelEdit = () => {
    setEditingServer(null);
    setEditConfig(null);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="container mx-auto py-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Codex MCP Server Management</h1>
        <McpLinkerButton />
      </div>

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick">Quick</TabsTrigger>
            <TabsTrigger value="configured">Configured</TabsTrigger>
            <TabsTrigger value="add">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="mt-6">
            <DefaultMcpServers servers={servers} onServerAdded={loadServers} />
          </TabsContent>

          <TabsContent value="configured" className="mt-6">
            <div className="space-y-2">
              {Object.entries(servers).map(([name, config]) => (
                <div key={name}>
                  {editingServer === name ? (
                    <div className="px-4">
                      <div className="space-y-4">
                        <McpServerForm
                          serverName={editConfig?.name ?? ''}
                          onServerNameChange={(name) =>
                            setEditConfig((prev) => (prev ? { ...prev, name } : null))
                          }
                          protocol={editConfig?.protocol ?? 'stdio'}
                          onProtocolChange={(protocol) =>
                            setEditConfig((prev) => (prev ? { ...prev, protocol } : null))
                          }
                          commandConfig={
                            editConfig?.command ?? {
                              command: '',
                              args: '',
                              env: '',
                            }
                          }
                          onCommandConfigChange={(command) =>
                            setEditConfig((prev) => (prev ? { ...prev, command } : null))
                          }
                          httpConfig={editConfig?.http ?? { url: '' }}
                          onHttpConfigChange={(http) =>
                            setEditConfig((prev) => (prev ? { ...prev, http } : null))
                          }
                          isEditMode={true}
                        />

                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <McpServerCard
                      name={name}
                      config={config}
                      loadServers={loadServers}
                      setServers={setServers}
                      onEdit={handleEditServer}
                    />
                  )}
                </div>
              ))}
              {Object.keys(servers).length === 0 && (
                <div className="text-gray-500 text-center py-8">No MCP servers configured</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="add" className="mt-6">
            <div className="max-w-md space-y-4">
              <McpServerForm
                serverName={newServerName}
                onServerNameChange={setNewServerName}
                protocol={newServerProtocol}
                onProtocolChange={setNewServerProtocol}
                commandConfig={commandConfig}
                onCommandConfigChange={setCommandConfig}
                httpConfig={httpConfig}
                onHttpConfigChange={setHttpConfig}
              />

              <Button onClick={handleAddServer} disabled={!newServerName} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
