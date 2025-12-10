import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProviderStore } from "@/stores";
import { invoke } from "@/lib/tauri-proxy";
import { ChevronDown, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AddModelForm, AddProviderForm } from "./model-provider-profile-form";
import { PromptOptimizerSettings } from "@/components/settings/PromptOptimizerSettings";
import { ConfigService } from "@/services/configService";
import { Badge } from "../ui/badge";

export function ProviderModels() {
  const {
    providers,
    selectedProviderId,
    selectedModel,
    setSelectedProviderId,
    setSelectedModel,
    setOllamaModels,
    deleteModel,
    deleteProvider,
    setProvidersFromConfig,
  } = useProviderStore();
  useEffect(() => {
    let isActive = true;
    ConfigService.getAllProviders()
      .then((configProviders) => {
        if (isActive) {
          setProvidersFromConfig(configProviders);
        }
      })
      .catch((error) => {
        console.error("Failed to load providers from config:", error);
      });
    return () => {
      isActive = false;
    };
  }, [setProvidersFromConfig]);
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

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={(open) => {
        setIsPopoverOpen(open);
        setShowAddModelForm(false);
      }}
      trigger={
        <Button variant="outline" size="sm" className="gap-2">
          <span className="font-medium text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{selectedModel ?? "Select Model"}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      }
      content={
        <Tabs defaultValue="model-settings">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="model-settings" className="text-xs sm:text-sm">Model Settings</TabsTrigger>
            <TabsTrigger value="add-profile" className="text-xs sm:text-sm">Add profile</TabsTrigger>
            <TabsTrigger value="prompt-optimizer" className="text-xs sm:text-sm">Prompt Optimizer</TabsTrigger>
          </TabsList>
          <TabsContent value="model-settings">
            <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 sm:gap-3">
                <div className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Providers
                    </Label>
                  </div>
                  <ScrollArea className="h-[180px] sm:h-[360px] pr-1">
                    <div className="grid gap-1">
                      {providers.map((p) => (
                        <div key={p.id} className="flex items-center gap-1">
                          <Button
                            variant={
                              p.id === selectedProviderId ? "secondary" : "ghost"
                            }
                            size="sm"
                            className="flex-1 min-w-0 justify-start overflow-hidden text-left gap-2 text-xs sm:text-sm"
                            onClick={() => {
                              setSelectedProviderId(p.id);
                              setShowAddModelForm(false);
                            }}
                          >
                            <span className="truncate">{p.name}</span>
                            {p.name === 'Codexia' && <Badge className="text-[10px] sm:text-xs">plus</Badge>}
                          </Button>
                          {p.id !== "openai" && p.id !== "codexia" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 flex-shrink-0 text-foreground hover:text-destructive"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete provider?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes the provider and its models.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={async () => {
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
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="rounded-md border p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Models
                    </Label>
                    {selectedProviderId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 sm:h-7"
                        onClick={() => setShowAddModelForm(!showAddModelForm)}
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span className="text-xs sm:hidden">Add</span>
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
                      <ScrollArea className="h-[180px] sm:max-h-[360px] pr-1">
                        <div className="grid gap-1">
                          {selectedProvider.models.map((m) => (
                            <div className="flex items-center gap-1" key={m}>
                              <Button
                              variant={
                                m === selectedModel ? "secondary" : "ghost"
                              }
                              size="sm"
                              className="flex-1 min-w-0 justify-start font-mono text-[10px] sm:text-xs overflow-hidden"
                              onClick={() => {
                                setSelectedModel(m);
                                setIsPopoverOpen(false);
                              }}
                            >
                                <span className="truncate">{m}</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0 text-foreground hover:text-destructive"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete model?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      The model will be removed from this
                                      provider. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => {
                                        if (selectedProviderId) {
                                          deleteModel(selectedProviderId, m);
                                        }
                                      }}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
          <TabsContent value="prompt-optimizer">
            <PromptOptimizerSettings />
          </TabsContent>
        </Tabs>
      }
      side="top"
      align="start"
      className="w-[95vw] sm:w-[520px] max-h-[80vh] sm:max-h-[520px] p-0"
    />
  );
}
