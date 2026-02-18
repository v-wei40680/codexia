import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listModels } from '@/services/tauri';
import type { Model } from '@/bindings/v2';
import type { ReasoningEffort } from '@/bindings';
import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/codex';
import { cn } from '@/lib/utils';

type Provider = 'openai' | 'ollama';
type OllamaModel = {
  id: string;
};

const OLLAMA_BASE_URL = 'http://localhost:11434/v1';
const OLLAMA_REASONING_OPTIONS: ReasoningEffort[] = ['low', 'medium', 'high'];

async function listOllamaModels(): Promise<OllamaModel[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`Failed to load Ollama models: ${response.status}`);
  }
  const payload = (await response.json()) as { data?: Array<{ id?: string }> };
  return (payload.data ?? []).filter((item): item is OllamaModel => typeof item.id === 'string');
}

export function ModelReasonSelector() {
  const [open, setOpen] = useState(false);
  const [openAiModels, setOpenAiModels] = useState<Model[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const {
    openaiModel,
    ollamaModel,
    modelProvider,
    setModel,
    setModelProvider,
    reasoningEffort,
    setReasoningEffort,
  } = useConfigStore();

  useEffect(() => {
    async function loadOpenAiModels() {
      const response = await listModels();
      setOpenAiModels(response.data);

      if (response.data.length === 0) {
        return;
      }

      if (!openaiModel) {
        const defaultModel = response.data.find((candidate) => candidate.isDefault) ?? response.data[0];
        if (modelProvider === 'openai') {
          setModel(defaultModel.id);
          setReasoningEffort(defaultModel.defaultReasoningEffort);
        }
      }
    }

    async function loadOllamaModelList() {
      try {
        const data = await listOllamaModels();
        setOllamaModels(data);
        if (data.length > 0 && !ollamaModel && modelProvider === 'ollama') {
          setModel(data[0].id);
          if (!OLLAMA_REASONING_OPTIONS.includes(reasoningEffort)) {
            setReasoningEffort('medium');
          }
        }
      } catch (error) {
        console.warn('[ModelReasonSelector] Failed to load Ollama models', error);
        setOllamaModels([]);
      }
    }

    void loadOpenAiModels();
    void loadOllamaModelList();
  }, []);

  const selectedOpenAiModel = openAiModels.find((candidate) => candidate.id === openaiModel);
  const openAiReasoningOptions = selectedOpenAiModel?.supportedReasoningEfforts ?? [];
  const activeProviderModel = modelProvider === 'openai' ? openaiModel : ollamaModel;
  const canSelectModel =
    modelProvider === 'openai' ? openAiModels.length > 0 : ollamaModels.length > 0;
  const canSelectReasoning =
    modelProvider === 'openai' ? openAiReasoningOptions.length > 0 : OLLAMA_REASONING_OPTIONS.length > 0;

  const onSelectOpenAiModel = (value: string) => {
    setModel(value);
    const selected = openAiModels.find((candidate) => candidate.id === value);
    if (selected) {
      setReasoningEffort(selected.defaultReasoningEffort);
    }
    setOpen(false);
  };

  const onSelectOllamaModel = (value: string) => {
    setModel(value);
    if (!OLLAMA_REASONING_OPTIONS.includes(reasoningEffort)) {
      setReasoningEffort('medium');
    }
    setOpen(false);
  };

  const onSelectEffort = (value: string) => {
    setReasoningEffort(value as ReasoningEffort);
  };

  const onChangeProvider = (provider: Provider) => {
    setModelProvider(provider);
    if (provider === 'ollama') {
      if (!ollamaModel && ollamaModels.length > 0) {
        setModel(ollamaModels[0].id);
      }
      if (!OLLAMA_REASONING_OPTIONS.includes(reasoningEffort)) {
        setReasoningEffort('medium');
      }
      return;
    }

    if (provider === 'openai') {
      if (!openaiModel && openAiModels.length > 0) {
        const fallback = openAiModels.find((candidate) => candidate.isDefault) ?? openAiModels[0];
        setModel(fallback.id);
        setReasoningEffort(fallback.defaultReasoningEffort);
        return;
      }
      const selected = openAiModels.find((candidate) => candidate.id === openaiModel);
      if (selected) {
        setReasoningEffort(selected.defaultReasoningEffort);
      }
    }
  };

  const activeModelDisplay = activeProviderModel || 'No model';

  return (
    <div className="flex items-center">
      <div className="inline-flex items-center gap-2 rounded-md border border-transparent px-2 transition-all hover:border-input hover:bg-accent/50">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <span className="text-xs">{activeModelDisplay}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <Tabs
              value={modelProvider}
              onValueChange={(value) => onChangeProvider(value as Provider)}
              className="gap-3"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="openai">openai</TabsTrigger>
                <TabsTrigger value="ollama">ollama</TabsTrigger>
              </TabsList>

              <TabsContent value="openai" className="space-y-2">
                {openAiModels.length === 0 ? (
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">No models</div>
                ) : (
                  <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                    {openAiModels.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => onSelectOpenAiModel(candidate.id)}
                        className={cn(
                          'w-full rounded-md border px-2 py-1.5 text-left transition-colors',
                          openaiModel === candidate.id
                            ? 'border-primary bg-accent'
                            : 'border-transparent hover:bg-accent/60'
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs">{candidate.displayName || candidate.model}</span>
                          <span className="text-[10px] text-muted-foreground">{candidate.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ollama" className="space-y-2">
                {ollamaModels.length === 0 ? (
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">No models</div>
                ) : (
                  <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                    {ollamaModels.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => onSelectOllamaModel(candidate.id)}
                        className={cn(
                          'w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                          ollamaModel === candidate.id
                            ? 'border-primary bg-accent'
                            : 'border-transparent hover:bg-accent/60'
                        )}
                      >
                        {candidate.id}
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        <Select
          value={reasoningEffort ?? ''}
          onValueChange={onSelectEffort}
          disabled={!canSelectModel || !canSelectReasoning}
        >
          <SelectTrigger className="h-8 w-[100px]">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            {modelProvider === 'openai'
              ? openAiReasoningOptions.map((option) => (
                  <SelectItem key={option.reasoningEffort} value={option.reasoningEffort}>
                    <div className="flex flex-col gap-0.5">
                      <span>{option.reasoningEffort}</span>
                      <span className="text-[10px] text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))
              : OLLAMA_REASONING_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
