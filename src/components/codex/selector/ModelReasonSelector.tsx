import { ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { listModels } from '@/services/tauri';
import type { Model } from '@/bindings/v2';
import type { ReasoningEffort } from '@/bindings';
import { useCallback, useEffect, useState } from 'react';
import { useConfigStore, useCodexStore } from '@/stores/codex';
import { codexService } from '@/services/codexService';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import { useModelSettingsStore } from '@/stores/settings';
import type { Provider } from '@/stores/settings';
import llmsJson from '@/assets/llms.json';

// ── Provider config read from assets/llms.json ────────────────────────────────

type LlmProviderConfig = {
  model_provider: string;
  base_url: string;
  auto_discover: boolean;
};

const LLM_PROVIDERS = llmsJson as LlmProviderConfig[];

// openai is always a built-in provider; others come from llms.json
const ALL_PROVIDERS = ['openai', ...LLM_PROVIDERS.map((p) => p.model_provider)];

const GENERIC_REASONING_OPTIONS: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh'];

// ── Shared types ──────────────────────────────────────────────────────────────

type ModelListItem = {
  id: string;
  label: string;
  description?: string;
};

// ── ModelList ─────────────────────────────────────────────────────────────────

type ModelListProps = {
  items: ModelListItem[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
};

function ModelList({ items, selectedId, onSelect, onRemove }: ModelListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground">No models</div>
    );
  }

  const topItems = items.slice(0, 2);
  const otherItems = items.slice(2);

  const renderItem = (item: ModelListItem) => (
    <div key={item.id} className="group relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className={cn(
          'flex-1 rounded-md border px-2 py-1.5 text-left transition-colors',
          selectedId === item.id
            ? 'border-primary bg-accent'
            : 'border-transparent hover:bg-accent/60',
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs">{item.label}</span>
            </div>
          </TooltipTrigger>
          {item.description && (
            <TooltipContent side="right">
              <p className="max-w-[200px] text-xs">{item.description}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {topItems.map(renderItem)}
        {otherItems.length > 0 && (
          <HoverCard openDelay={100} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="w-full rounded-md border border-transparent px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60"
              >
                Other models...
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="right" align="start" className="w-64 p-2">
              <div className="max-h-60 space-y-1 overflow-y-auto">
                {otherItems.map(renderItem)}
              </div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Fetch models from an OpenAI-compatible endpoint ───────────────────────────

async function fetchOpenAiCompatibleModels(baseUrl: string): Promise<ModelListItem[]> {
  try {
    const response = await fetch(`${baseUrl}/models`);
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    return (payload.data ?? [])
      .filter((item): item is { id: string } => typeof item.id === 'string')
      .map((item) => ({ id: item.id, label: item.id }));
  } catch {
    return [];
  }
}

// ── useModels hook ────────────────────────────────────────────────────────────

function useModels() {
  const [openAiModels, setOpenAiModels] = useState<Model[]>([]);
  // Models fetched from each provider's base_url (auto-discovered)
  const [fetchedModels, setFetchedModels] = useState<Record<string, ModelListItem[]>>({});
  const { models: storedModels } = useModelSettingsStore();

  // Load openai models via Tauri command
  useEffect(() => {
    void listModels()
      .then((res) => setOpenAiModels(res.data))
      .catch(() => { });
  }, []);

  // Load models from every provider listed in llms.json
  useEffect(() => {
    async function load() {
      const results: Record<string, ModelListItem[]> = {};
      await Promise.all(
        LLM_PROVIDERS.map(async (p) => {
          if (p.base_url) {
            results[p.model_provider] = await fetchOpenAiCompatibleModels(p.base_url);
          }
        }),
      );
      setFetchedModels(results);
    }
    void load();
  }, []);

  // Returns all items for a given provider key
  const providerItems = useCallback(
    (provider: string): ModelListItem[] => {
      if (provider === 'openai') {
        return openAiModels.map((m) => ({
          id: m.id,
          label: m.displayName || m.model,
          description: m.description,
        }));
      }
      // Merge user-stored models + auto-fetched models (dedup by id)
      const stored = (storedModels[provider] ?? []).map((m) => ({ id: m.id, label: m.name }));
      const fetched = fetchedModels[provider] ?? [];
      const all = [...stored];
      for (const f of fetched) {
        if (!all.some((a) => a.id === f.id)) all.push(f);
      }
      return all;
    },
    [openAiModels, storedModels, fetchedModels],
  );

  return { openAiModels, providerItems };
}

// ── BaseModelSelector ─────────────────────────────────────────────────────────

type BaseModelSelectorProps = {
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  value: string | undefined;
  onValueChange: (id: string) => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (value: ReasoningEffort) => void;
  disabled?: boolean;
  openAiModels: Model[];
  providerItems: (provider: string) => ModelListItem[];
};

function BaseModelSelector({
  provider,
  onProviderChange,
  value,
  onValueChange,
  reasoningEffort,
  onReasoningEffortChange,
  disabled = false,
  openAiModels,
  providerItems,
}: BaseModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const { addModel, removeModel } = useModelSettingsStore();

  const handleSelect = useCallback(
    (id: string) => {
      onValueChange(id);
      if (provider === 'openai') {
        const selected = openAiModels.find((m) => m.id === id);
        if (selected && onReasoningEffortChange) {
          onReasoningEffortChange(selected.defaultReasoningEffort);
        }
      } else if (onReasoningEffortChange && (!reasoningEffort || !GENERIC_REASONING_OPTIONS.includes(reasoningEffort))) {
        onReasoningEffortChange('medium');
      }
      setOpen(false);
    },
    [onValueChange, provider, openAiModels, onReasoningEffortChange, reasoningEffort],
  );

  const handleAddNewModel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newModelId.trim();
    if (!trimmed) return;
    addModel(provider, { id: trimmed, name: trimmed });
    setNewModelId('');
  };

  const currentItems = providerItems(provider);
  const activeItem = currentItems.find((m) => m.id === value);
  const activeLabel = activeItem?.label ?? value ?? 'Select model';

  const selectedOpenAiModel = provider === 'openai' ? openAiModels.find((m) => m.id === value) : undefined;
  const openAiReasoningOptions = selectedOpenAiModel?.supportedReasoningEfforts ?? [];
  const canSelectReasoning = provider === 'openai' ? openAiReasoningOptions.length > 0 : true;

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

          <PopoverContent className="w-80 p-0" align="start">
            <Tabs value={provider} onValueChange={(v) => onProviderChange(v as Provider)}>
              {/* Dynamic grid: one column per provider */}
              <TabsList
                style={{ gridTemplateColumns: `repeat(${ALL_PROVIDERS.length}, 1fr)` }}
                className="grid w-full"
              >
                {ALL_PROVIDERS.map((p) => (
                  <TabsTrigger key={p} value={p}>{p}</TabsTrigger>
                ))}
              </TabsList>

              {/* openai — read-only list from Tauri */}
              <TabsContent value="openai" className="p-2 space-y-2">
                <ModelList
                  items={providerItems('openai')}
                  selectedId={value}
                  onSelect={handleSelect}
                />
              </TabsContent>

              {/* Dynamic providers from llms.json — show add/remove form */}
              {LLM_PROVIDERS.map((p) => (
                <TabsContent key={p.model_provider} value={p.model_provider} className="p-2 space-y-2">
                  {/* Only show the manual add form for providers that don't auto-discover */}
                  {!p.auto_discover && (
                    <form onSubmit={handleAddNewModel} className="flex gap-1 mb-2">
                      <Input
                        placeholder="model-id"
                        className="h-7 text-xs"
                        value={newModelId}
                        onChange={(e) => setNewModelId(e.target.value)}
                      />
                      <Button type="submit" size="icon" className="h-7 w-7">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </form>
                  )}
                  <ModelList
                    items={providerItems(p.model_provider)}
                    selectedId={value}
                    onSelect={handleSelect}
                    onRemove={!p.auto_discover ? (id) => removeModel(p.model_provider, id) : undefined}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </PopoverContent>
        </Popover>

        {reasoningEffort !== undefined && onReasoningEffortChange && (
          <Select
            value={reasoningEffort}
            onValueChange={(v) => onReasoningEffortChange(v as ReasoningEffort)}
            disabled={disabled || !value || !canSelectReasoning}
          >
            <SelectTrigger className="h-8 w-fit border-none shadow-none focus:ring-0 px-2">
              <SelectValue placeholder="Default">{reasoningEffort.charAt(0)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <TooltipProvider>
                {provider === 'openai'
                  ? openAiReasoningOptions.map((option) => (
                    <SelectItem key={option.reasoningEffort} value={option.reasoningEffort}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{option.reasoningEffort}</span>
                        </TooltipTrigger>
                        {option.description && (
                          <TooltipContent side="right">
                            <p>{option.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </SelectItem>
                  ))
                  : GENERIC_REASONING_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
              </TooltipProvider>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

// ── ModelReasonSelector ───────────────────────────────────────────────────────

export function ModelReasonSelector() {
  const { currentThreadId } = useCodexStore();
  const { openAiModels, providerItems } = useModels();

  const {
    modelProvider,
    providerModels,
    setModel,
    setModelProvider,
    reasoningEffort,
    setReasoningEffort,
  } = useConfigStore();

  // Auto-select default openai model on first load
  useEffect(() => {
    if (modelProvider === 'openai' && !providerModels['openai'] && openAiModels.length > 0) {
      const defaultModel = openAiModels.find((m) => m.isDefault) ?? openAiModels[0];
      setModel(defaultModel.id);
      setReasoningEffort(defaultModel.defaultReasoningEffort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAiModels.length, modelProvider]);

  const onProviderChange = (p: Provider) => {
    setModelProvider(p);
    if (p === 'openai') {
      const savedModel = providerModels['openai'];
      const selected = openAiModels.find((m) => m.id === savedModel);
      if (selected) {
        setReasoningEffort(selected.defaultReasoningEffort);
      } else if (openAiModels.length > 0) {
        const fallback = openAiModels.find((m) => m.isDefault) ?? openAiModels[0];
        setModel(fallback.id);
        setReasoningEffort(fallback.defaultReasoningEffort);
      }
    } else if (!GENERIC_REASONING_OPTIONS.includes(reasoningEffort)) {
      setReasoningEffort('medium');
    }
    if (currentThreadId) {
      void codexService.threadResume(currentThreadId);
    }
  };

  return (
    <BaseModelSelector
      provider={modelProvider}
      onProviderChange={onProviderChange}
      value={providerModels[modelProvider] ?? ''}
      onValueChange={setModel}
      reasoningEffort={reasoningEffort}
      onReasoningEffortChange={setReasoningEffort}
      openAiModels={openAiModels}
      providerItems={providerItems}
    />
  );
}

// ── CodexModelSelector ────────────────────────────────────────────────────────

type CodexModelSelectorProps = {
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  value: string;
  onValueChange: (value: string) => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (value: ReasoningEffort) => void;
  disabled?: boolean;
};

export function CodexModelSelector({
  provider,
  onProviderChange,
  value,
  onValueChange,
  reasoningEffort,
  onReasoningEffortChange,
  disabled = false,
}: CodexModelSelectorProps) {
  const { openAiModels, providerItems } = useModels();

  return (
    <BaseModelSelector
      provider={provider}
      onProviderChange={onProviderChange}
      value={value}
      onValueChange={onValueChange}
      reasoningEffort={reasoningEffort}
      onReasoningEffortChange={onReasoningEffortChange}
      disabled={disabled}
      openAiModels={openAiModels}
      providerItems={providerItems}
    />
  );
}
