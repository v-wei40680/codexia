import { useState } from "react";
import { useCCStore } from "@/stores/ccStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Save, X, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { CCMcpServerConfig, CCMcpServers } from "@/types/cc-mcp";
import { toast } from "sonner";

type ServerType = "stdio" | "http" | "sse";

export default function CCMcpView() {
  const { options, updateOptions } = useCCStore();
  const servers = options.mcpServers || {};

  const [activeTab, setActiveTab] = useState("configured");
  const [editingServer, setEditingServer] = useState<string | null>(null);

  // Add server state
  const [newServerName, setNewServerName] = useState("");
  const [newServerType, setNewServerType] = useState<ServerType>("stdio");
  const [newCommand, setNewCommand] = useState("");
  const [newArgs, setNewArgs] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newEnv, setNewEnv] = useState("");

  // Edit server state
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<ServerType>("stdio");
  const [editCommand, setEditCommand] = useState("");
  const [editArgs, setEditArgs] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editEnv, setEditEnv] = useState("");

  const handleAddServer = () => {
    if (!newServerName.trim()) {
      toast.error("Server name is required");
      return;
    }

    if (servers[newServerName]) {
      toast.error("Server name already exists");
      return;
    }

    let config: CCMcpServerConfig;

    try {
      if (newServerType === "stdio") {
        if (!newCommand.trim()) {
          toast.error("Command is required for stdio servers");
          return;
        }

        config = {
          type: "stdio",
          command: newCommand,
          args: newArgs ? newArgs.split(" ").filter(a => a.trim()) : undefined,
        };

        if (newEnv.trim()) {
          config.env = JSON.parse(newEnv);
        }
      } else {
        if (!newUrl.trim()) {
          toast.error("URL is required for HTTP/SSE servers");
          return;
        }

        config = {
          type: newServerType,
          url: newUrl,
        };
      }

      const updatedServers: CCMcpServers = {
        ...servers,
        [newServerName]: config,
      };

      updateOptions({ mcpServers: updatedServers });

      // Reset form
      setNewServerName("");
      setNewCommand("");
      setNewArgs("");
      setNewUrl("");
      setNewEnv("");
      setActiveTab("configured");
      toast.success(`Server "${newServerName}" added successfully`);
    } catch (error) {
      toast.error("Invalid environment JSON format");
    }
  };

  const handleDeleteServer = (name: string) => {
    const updatedServers = { ...servers };
    delete updatedServers[name];
    updateOptions({
      mcpServers: Object.keys(updatedServers).length > 0 ? updatedServers : undefined,
    });
    toast.success(`Server "${name}" deleted`);
  };

  const handleEditClick = (name: string, config: CCMcpServerConfig) => {
    setEditingServer(name);
    setEditName(name);

    const type = config.type || "stdio";
    setEditType(type);

    if (type === "stdio") {
      setEditCommand("command" in config ? config.command : "");
      setEditArgs("args" in config && config.args ? config.args.join(" ") : "");
      setEditEnv("env" in config && config.env ? JSON.stringify(config.env, null, 2) : "");
      setEditUrl("");
    } else {
      setEditUrl("url" in config ? config.url : "");
      setEditCommand("");
      setEditArgs("");
      setEditEnv("");
    }
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) {
      toast.error("Server name is required");
      return;
    }

    let config: CCMcpServerConfig;

    try {
      if (editType === "stdio") {
        if (!editCommand.trim()) {
          toast.error("Command is required for stdio servers");
          return;
        }

        config = {
          type: "stdio",
          command: editCommand,
          args: editArgs ? editArgs.split(" ").filter(a => a.trim()) : undefined,
        };

        if (editEnv.trim()) {
          config.env = JSON.parse(editEnv);
        }
      } else {
        if (!editUrl.trim()) {
          toast.error("URL is required for HTTP/SSE servers");
          return;
        }

        config = {
          type: editType,
          url: editUrl,
        };
      }

      const updatedServers = { ...servers };

      // Remove old server if name changed
      if (editingServer && editingServer !== editName) {
        delete updatedServers[editingServer];
      }

      updatedServers[editName] = config;
      updateOptions({ mcpServers: updatedServers });

      setEditingServer(null);
      toast.success(`Server "${editName}" updated successfully`);
    } catch (error) {
      toast.error("Invalid environment JSON format");
    }
  };

  const handleCancelEdit = () => {
    setEditingServer(null);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">Claude Code MCP Servers</h2>
        <p className="text-sm text-muted-foreground">
          Manage MCP servers for Claude Code sessions
        </p>
      </div>

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
            {Object.keys(servers).length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No MCP servers configured</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setActiveTab("add")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first server
                </Button>
              </Card>
            ) : (
              Object.entries(servers).map(([name, config]) => (
                <Card key={name} className="p-4">
                  {editingServer === name ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Server Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Type</Label>
                        <Select value={editType} onValueChange={(v) => setEditType(v as ServerType)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stdio">Stdio</SelectItem>
                            <SelectItem value="http">HTTP</SelectItem>
                            <SelectItem value="sse">SSE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {editType === "stdio" ? (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs">Command</Label>
                            <Input
                              value={editCommand}
                              onChange={(e) => setEditCommand(e.target.value)}
                              className="h-8 text-xs font-mono"
                              placeholder="node"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Arguments (space-separated)</Label>
                            <Input
                              value={editArgs}
                              onChange={(e) => setEditArgs(e.target.value)}
                              className="h-8 text-xs font-mono"
                              placeholder="server.js --port 3000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Environment (JSON)</Label>
                            <Textarea
                              value={editEnv}
                              onChange={(e) => setEditEnv(e.target.value)}
                              className="text-xs font-mono"
                              placeholder='{"KEY": "value"}'
                              rows={3}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs">URL</Label>
                          <Input
                            value={editUrl}
                            onChange={(e) => setEditUrl(e.target.value)}
                            className="h-8 text-xs"
                            placeholder="http://localhost:3000"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-medium">{name}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted">
                            {config.type || "stdio"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {config.type === "stdio" || !config.type
                            ? `${"command" in config ? config.command : ""} ${"args" in config && config.args ? config.args.join(" ") : ""}`
                            : "url" in config ? config.url : ""}
                        </p>
                        {"env" in config && config.env && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Env: {Object.keys(config.env).length} variable(s)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditClick(name, config)}
                          className="h-7 w-7"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteServer(name)}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="add" className="flex-1 overflow-y-auto mt-4">
          <Card className="p-4 max-w-2xl">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Server Name</Label>
                <Input
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="my-mcp-server"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Type</Label>
                <Select value={newServerType} onValueChange={(v) => setNewServerType(v as ServerType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stdio">Stdio</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="sse">SSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newServerType === "stdio" ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Command</Label>
                    <Input
                      value={newCommand}
                      onChange={(e) => setNewCommand(e.target.value)}
                      placeholder="node"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Arguments (space-separated)</Label>
                    <Input
                      value={newArgs}
                      onChange={(e) => setNewArgs(e.target.value)}
                      placeholder="server.js --port 3000"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Environment Variables (JSON, optional)</Label>
                    <Textarea
                      value={newEnv}
                      onChange={(e) => setNewEnv(e.target.value)}
                      placeholder='{"API_KEY": "your-key", "PORT": "3000"}'
                      className="text-xs font-mono"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <Button
                onClick={handleAddServer}
                className="w-full"
                disabled={
                  !newServerName.trim() ||
                  (newServerType === "stdio" ? !newCommand.trim() : !newUrl.trim())
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Server
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
