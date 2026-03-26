import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { McpServerForm } from '@/components/features/mcp/McpServerForm';
import { useWorkspaceStore } from '@/stores';
import { unifiedAddMcpServer, ccMcpAdd } from '@/services';
import type { McpServerConfig } from '@/types';
import { toast } from 'sonner';

interface McpAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAgent: string;
  onServerAdded: () => void;
}

export function McpAddSheet({ open, onOpenChange, selectedAgent, onServerAdded }: McpAddSheetProps) {
  const { cwd } = useWorkspaceStore();
  const [serverName, setServerName] = useState('');
  const [protocol, setProtocol] = useState<'stdio' | 'http' | 'sse'>('stdio');
  const [commandConfig, setCommandConfig] = useState({ command: '', args: '', env: '' });
  const [httpConfig, setHttpConfig] = useState({ url: '' });

  const resetForm = () => {
    setServerName('');
    setProtocol('stdio');
    setCommandConfig({ command: '', args: '', env: '' });
    setHttpConfig({ url: '' });
  };

  const handleAdd = async () => {
    if (!serverName.trim()) return;

    try {
      if (selectedAgent === 'codex') {
        let config: McpServerConfig;
        if (protocol === 'stdio') {
          config = {
            type: 'stdio',
            command: commandConfig.command,
            args: commandConfig.args.split(' ').filter((a) => a.trim()),
          };
          if (commandConfig.env.trim()) {
            try {
              config.env = JSON.parse(commandConfig.env);
            } catch {
              toast.error('Invalid JSON format for environment variables');
              return;
            }
          }
        } else {
          config = { type: protocol, url: httpConfig.url };
        }
        await unifiedAddMcpServer({ clientName: 'codex', serverName, serverConfig: config });
      } else {
        const request: any = { name: serverName, type: protocol, scope: 'local', enabled: true };
        if (protocol === 'stdio') {
          if (!commandConfig.command.trim()) {
            toast.error('Command is required for stdio servers');
            return;
          }
          request.command = commandConfig.command;
          request.args = commandConfig.args
            ? commandConfig.args.split(' ').filter((a) => a.trim())
            : undefined;
          if (commandConfig.env.trim()) {
            try {
              request.env = JSON.parse(commandConfig.env);
            } catch {
              toast.error('Invalid JSON format for environment variables');
              return;
            }
          }
        } else {
          if (!httpConfig.url.trim()) {
            toast.error('URL is required for HTTP/SSE servers');
            return;
          }
          request.url = httpConfig.url;
        }
        await ccMcpAdd(request, cwd || '');
      }

      toast.success(`Server "${serverName}" added successfully`);
      resetForm();
      onServerAdded();
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to add MCP server: ' + error);
    }
  };

  const isDisabled =
    !serverName.trim() ||
    (protocol === 'stdio' ? !commandConfig.command.trim() : !httpConfig.url.trim());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="mb-4">
          <SheetTitle>Add MCP Server</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <McpServerForm
            serverName={serverName}
            onServerNameChange={setServerName}
            protocol={protocol}
            onProtocolChange={setProtocol}
            commandConfig={commandConfig}
            onCommandConfigChange={setCommandConfig}
            httpConfig={httpConfig}
            onHttpConfigChange={setHttpConfig}
          />
          <Button onClick={handleAdd} disabled={isDisabled} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Server
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
