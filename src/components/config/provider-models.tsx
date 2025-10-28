import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProviderStore } from "@/stores/useProviderStore";
import { ChevronDown, PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { open as openUrl } from "@tauri-apps/plugin-shell";

function AddProviderForm({ onAdd }: { onAdd: () => void }) {
  const [name, setName] = useState("");
  const [models, setModels] = useState("");
  const addProvider = useProviderStore((s) => s.addProvider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !models) return;
    addProvider({
      name,
      models: models
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    });
    onAdd();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Provider Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., My Custom AI"
        />
      </div>
      <div className="space-y-2">
        <Label>Models (comma-separated)</Label>
        <Input
          value={models}
          onChange={(e) => setModels(e.target.value)}
          placeholder="model-1, model-2"
        />
      </div>
      <Button type="submit" size="sm" className="w-full">
        Add Provider
      </Button>
    </form>
  );
}

function AddModelForm({
  providerId,
  onAdd,
}: {
  providerId: string;
  onAdd: () => void;
}) {
  const [modelName, setModelName] = useState("");
  const addModel = useProviderStore((s) => s.addModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    addModel(providerId, modelName.trim());
    setModelName("");
    onAdd();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Model Name</Label>
        <Input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="e.g., new-model-v1"
        />
      </div>
      <Button type="submit" size="sm" className="w-full">
        Add Model
      </Button>
    </form>
  );
}

export function ProviderModels() {
  const {
    providers,
    selectedProviderId,
    selectedModel,
    setSelectedProviderId,
    setSelectedModel,
    setApiKey,
    setApiKeyVar,
    setBaseUrl,
    setOllamaModels,
    deleteModel,
  } = useProviderStore();

  useEffect(() => {
    if (selectedProviderId === "ollama") {
      fetch("http://localhost:11434/v1/models")
        .then((resp) => resp.json())
        .then((data) => {
          const ossModels = data.data.map((item: any) => item.id);
          setOllamaModels(ossModels);
          console.log("ollama models:", ossModels);
        })
        .catch((error) => {
          console.error("Failed to fetch Ollama models:", error);
        });
    }
  }, [selectedProviderId, setOllamaModels]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddModelForm, setShowAddModelForm] = useState(false);
  const [showProviderDetails, setShowProviderDetails] = useState(false);

  const selectedProvider = providers.find((p) => p.id === selectedProviderId);

  const currentApiKey = selectedProvider?.apiKey ?? "";
  const currentApiKeyVar = selectedProvider?.apiKeyVar ?? "";
  const currentBaseUrl = selectedProvider?.baseUrl ?? "";
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedProviderId) {
      setApiKey(selectedProviderId, e.target.value);
    }
  };
  const handleApiKeyVarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedProviderId) {
      setApiKeyVar(selectedProviderId, e.target.value);
    }
  };
  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (selectedProviderId) {
      setBaseUrl(selectedProviderId, e.target.value);
    }
  };

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        setIsPopoverOpen(open);
        setShowAddForm(false);
        setShowAddModelForm(false);
        setShowProviderDetails(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="font-medium">{selectedModel ?? "Select Model"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] h-[480px] p-0" align="end">
        <div className="flex p-4 pb-3">
          <h3 className="font-semibold text-lg">Model Settings</h3>
          <Button
            onClick={() =>
              openUrl(
                "https://github.com/milisp/codexia/blob/main/docs/config.toml",
              )
            }
          >
            online config.toml example
          </Button>
        </div>
        <Separator />
        <div className="flex h-96">
          {/* Left: Providers */}
          <div className="w-36 border-r">
            <div className="flex items-center justify-between p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Providers
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[480px]">
              {showAddForm ? (
                <AddProviderForm onAdd={() => setShowAddForm(false)} />
              ) : (
                <div className="px-2 pb-2 space-y-1">
                  {providers.map((p) => (
                    <Button
                      key={p.id}
                      variant={
                        p.id === selectedProviderId ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start relative"
                      onClick={() => {
                        setSelectedProviderId(p.id);
                        setShowAddModelForm(false); // Hide add model form when changing provider
                        setShowProviderDetails(false);
                      }}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: API Key & Models */}
          <div className="flex-1 flex flex-col">
            {/* Top: API Key */}
            <div className="p-4 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                API Key {selectedProviderId !== "ollama" && "option"}
              </Label>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="api key"
                  value={currentApiKey}
                  onChange={handleApiKeyChange}
                  className="font-mono text-xs"
                  disabled={!selectedProviderId}
                />
              </div>
              <Collapsible
                open={showProviderDetails}
                onOpenChange={setShowProviderDetails}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 gap-2 text-xs"
                    disabled={!selectedProviderId}
                  >
                    {showProviderDetails
                      ? "Hide additional fields"
                      : "Show additional fields"}
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        showProviderDetails ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      API Key Variable
                    </Label>
                    <Input
                      placeholder="e.g., OPENAI_API_KEY"
                      value={currentApiKeyVar}
                      onChange={handleApiKeyVarChange}
                      className="font-mono text-xs"
                      disabled={!selectedProviderId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Base URL
                    </Label>
                    <Input
                      placeholder="https://api.example.com/v1"
                      value={currentBaseUrl}
                      onChange={handleBaseUrlChange}
                      className="font-mono text-xs"
                      disabled={!selectedProviderId}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Separator />

            {/* Bottom: Models */}
            <div className="flex-1 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Models
                </Label>
                {selectedProviderId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setShowAddModelForm(!showAddModelForm)}
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedProviderId && showAddModelForm ? (
                <AddModelForm
                  providerId={selectedProviderId}
                  onAdd={() => setShowAddModelForm(false)}
                />
              ) : (
                selectedProvider && (
                  <ScrollArea className="h-56 rounded-md border">
                    <div className="p-2 space-y-1">
                      {selectedProvider.models.map((m) => (
                        <div className="flex" key={m}>
                          <Button
                            variant={
                              m === selectedModel ? "secondary" : "ghost"
                            }
                            size="sm"
                            className="w-full justify-start font-mono text-xs relative group"
                            onClick={() => {
                              setSelectedModel(m);
                              setIsPopoverOpen(false);
                            }}
                          >
                            <span className="flex-grow text-left">{m}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 transition-opacity absolute right-2 hover:bg-red-200"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent the model selection when clicking the delete button
                              if (selectedProviderId) {
                                deleteModel(selectedProviderId, m);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
