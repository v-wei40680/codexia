import { ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listModels } from '@/services/tauri';
import type { Model } from '@/bindings/v2';
import type { ReasoningEffort } from '@/bindings';
import { useCallback, useEffect, useState } from 'react';
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

type ModelListItem = {
  id: string;
  label: string;
  description?: string;
};

type ModelListProps = {
  items: ModelListItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
};

function ModelList({ items, selectedId, onSelect }: ModelListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">No models</div>
    );
  }

  return (
    <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={cn(
            'w-full rounded-md border px-2 py-1.5 text-left transition-colors',
            selectedId === item.id
              ? 'border-primary bg-accent'
              : 'border-transparent hover:bg-accent/60',
          )}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs">{item.label}</span>
            {item.description && (
              <span className="text-[10px] text-muted-foreground">{item.description}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

export function ModelReasonSelector() {
  const [open, setOpen] = useState(false);
  const [openAiModels, setOpenAiModels] = useState<Model[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [ollamaFetched, setOllamaFetched] = useState(false);
  const [ollamaLoading, setOllamaLoading] = useState(false);

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
      if (response.data.length === 0 || openaiModel) return;

      if (modelProvider === 'openai') {
        const defaultModel = response.data.find((m) => m.isDefault) ?? response.data[0];
        setModel(defaultModel.id);
        setReasoningEffort(defaultModel.defaultReasoningEffort);
      }
    }

    void loadOpenAiModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modelProvider !== 'ollama' || ollamaFetched) return;

    async function loadOllamaModelList() {
      setOllamaLoading(true);
      try {
        const data = await listOllamaModels();
        setOllamaModels(data);
        if (data.length > 0 && !ollamaModel) {
          setModel(data[0].id);
          if (!OLLAMA_REASONING_OPTIONS.includes(reasoningEffort)) {
            setReasoningEffort('medium');
          }
        }
      } catch (error) {
        console.warn('[ModelReasonSelector] Failed to load Ollama models', error);
        setOllamaModels([]);
      } finally {
        setOllamaFetched(true);
        setOllamaLoading(false);
      }
    }

    void loadOllamaModelList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelProvider, ollamaFetched]);

  const selectedOpenAiModel = openAiModels.find((m) => m.id === openaiModel);
  const openAiReasoningOptions = selectedOpenAiModel?.supportedReasoningEfforts ?? [];

  const activeProviderModel = modelProvider === 'openai' ? openaiModel : ollamaModel;
  const canSelectModel = modelProvider === 'openai' ? openAiModels.length > 0 : ollamaModels.length > 0;
  const canSelectReasoning = modelProvider === 'openai' ? openAiReasoningOptions.length > 0 : true;

  const onSelectOpenAiModel = (id: string) => {
    setModel(id);
    const selected = openAiModels.find((m) => m.id === id);
    if (selected) setReasoningEffort(selected.defaultReasoningEffort);
    setOpen(false);
  };

  const onSelectOllamaModel = (id: string) => {
    setModel(id);
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
      if (!ollamaModel && ollamaModels.length > 0) setModel(ollamaModels[0].id);
      if (!OLLAMA_REASONING_OPTIONS.includes(reasoningEffort)) setReasoningEffort('medium');
      return;
    }

    if (!openaiModel && openAiModels.length > 0) {
      const fallback = openAiModels.find((m) => m.isDefault) ?? openAiModels[0];
      setModel(fallback.id);
      setReasoningEffort(fallback.defaultReasoningEffort);
      return;
    }
    const selected = openAiModels.find((m) => m.id === openaiModel);
    if (selected) setReasoningEffort(selected.defaultReasoningEffort);
  };

  const openAiItems: ModelListItem[] = openAiModels.map((m) => ({
    id: m.id,
    label: m.displayName || m.model,
    description: m.description,
  }));

  const ollamaItems: ModelListItem[] = ollamaModels.map((m) => ({ id: m.id, label: m.id }));

  return (
    <div className="flex items-center">
      <div className="inline-flex items-center gap-2 rounded-md border border-transparent px-2 transition-all hover:border-input hover:bg-accent/50">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <span className="text-xs">{activeProviderModel ?? 'No model'}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-3" align="start">
            <Tabs
              value={modelProvider}
              onValueChange={(v) => onChangeProvider(v as Provider)}
              className="gap-3"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="openai">openai</TabsTrigger>
                <TabsTrigger value="ollama">ollama</TabsTrigger>
              </TabsList>

              <TabsContent value="openai" className="space-y-2">
                <ModelList
                  items={openAiItems}
                  selectedId={openaiModel}
                  onSelect={onSelectOpenAiModel}
                />
              </TabsContent>

              <TabsContent value="ollama" className="space-y-2">
                {ollamaLoading ? (
                  <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                    Loading…
                  </div>
                ) : (
                  <ModelList
                    items={ollamaItems}
                    selectedId={ollamaModel}
                    onSelect={onSelectOllamaModel}
                  />
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

type CodexModelSelectorProps = {
  provider: Provider;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
};

export function CodexModelSelector({
  provider,
  value,
  onValueChange,
  disabled = false,
}: CodexModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [openAiModels, setOpenAiModels] = useState<Model[]>([]);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);

  const handleSelect = useCallback(
    (id: string) => {
      onValueChange(id);
      setOpen(false);
    },
    [onValueChange],
  );

  useEffect(() => {
    async function loadModels() {
      try {
        if (provider === 'openai') {
          const response = await listModels();
          setOpenAiModels(response.data);

          if (response.data.length === 0) {
            if (value) onValueChange('');
            return;
          }
          if (!response.data.some((m) => m.id === value)) {
            const fallback = response.data.find((m) => m.isDefault) ?? response.data[0];
            onValueChange(fallback.id);
          }
          return;
        }

        const data = await listOllamaModels();
        setOllamaModels(data);

        if (data.length === 0) {
          if (value) onValueChange('');
          return;
        }
        if (!data.some((m) => m.id === value)) {
          onValueChange(data[0].id);
        }
      } catch (error) {
        console.warn('[CodexModelSelector] Failed to load models', error);
        if (provider === 'openai') setOpenAiModels([]);
        else setOllamaModels([]);
      }
    }

    void loadModels();
    // onValueChange is intentionally omitted to prevent re-fetching on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const items: ModelListItem[] =
    provider === 'openai'
      ? openAiModels.map((m) => ({ id: m.id, label: m.displayName || m.model, description: m.description }))
      : ollamaModels.map((m) => ({ id: m.id, label: m.id }));

  const activeLabel =
    provider === 'openai'
      ? (openAiModels.find((m) => m.id === value)?.displayName ?? value)
      : value || 'Select model';

  return (
    <div className="flex items-center">
      <div className="inline-flex items-center gap-2 rounded-md border border-transparent px-2 transition-all hover:border-input hover:bg-accent/50">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2" disabled={disabled}>
              <span className="text-xs">{activeLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80 p-3" align="start">
            <ModelList items={items} selectedId={value} onSelect={handleSelect} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
