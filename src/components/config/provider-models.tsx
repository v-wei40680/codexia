import { invoke } from "@/lib/tauri-proxy";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProviderStore } from "@/stores";
import { ChevronDown, PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddModelForm, AddProviderForm } from "./model-provider-profile-form";
import { ProviderDetailsCollapsible } from "./provider-details-collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

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
    deleteProvider,
  } = useProviderStore();
  const navigate = useNavigate();
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

  const [showAddModelForm, setShowAddModelForm] = useState(false);

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
        setShowAddModelForm(false);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="font-medium">{selectedModel ?? "Select Model"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] h-[480px] p-0" align="end">
        <Tabs defaultValue="model-settiongs">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="model-settiongs">Model Settiongs</TabsTrigger>
            <TabsTrigger value="add-profile">Add profile</TabsTrigger>
          </TabsList>
          <TabsContent value="model-settiongs">
            <div className="flex">
              <div className="w-36 border-r">
                <ScrollArea className="h-[calc(100%-48px)]">
                  <div className="px-2 pb-2 space-y-1">
                    {providers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between w-24"
                      >
                        <Button
                          variant={
                            p.id === selectedProviderId ? "secondary" : "ghost"
                          }
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => {
                            setSelectedProviderId(p.id);
                            setShowAddModelForm(false); // Hide add model form when changing provider
                          }}
                        >
                          {p.name}
                        </Button>
                        {p.id !== "openai" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-red-200"
                            onClick={async (e) => {
                              e.stopPropagation();
                              deleteProvider(p.id);
                              try {
                                await invoke("delete_model_provider", {
                                  providerName: p.id,
                                });
                              } catch (error) {
                                console.error(
                                  "Failed to delete model provider from backend:",
                                  error,
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Content */}
              <div className="flex-1 flex flex-col">
                {/* Top: API Key */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      API Key {selectedProviderId !== "ollama" && "option"}
                    </Label>
                    <Button onClick={() => navigate("/settings")}>
                      Prompt Optimizer
                    </Button>
                  </div>
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
                  <ProviderDetailsCollapsible
                    selectedProviderId={selectedProviderId}
                    currentApiKeyVar={currentApiKeyVar}
                    currentBaseUrl={currentBaseUrl}
                    handleApiKeyVarChange={handleApiKeyVarChange}
                    handleBaseUrlChange={handleBaseUrlChange}
                  />
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
                                <span className="grow text-left">{m}</span>
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
          </TabsContent>
          <TabsContent value="add-profile">
            <AddProviderForm />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
