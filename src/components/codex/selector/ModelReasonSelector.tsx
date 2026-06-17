import { ChevronsUpDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ReasoningEffort } from '@/bindings';
import { useCallback, useEffect, useState } from 'react';
import { useConfigStore, useCodexStore } from '@/stores/codex';
import { codexService } from '@/services/codexService';
import type { Provider } from '@/stores/settings';
import { ModelList } from './ModelList';
import { useModels } from '../hooks';
import { Input } from '@/components/ui/input';
import { EnvKeysDialog } from './EnvKeysDialog';

const GENERIC_REASONING_OPTIONS: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh'];

type BaseModelSelectorProps = {
  provider: Provider;
  onProviderChange: (provider: Provider) => void;
  value: string | undefined;
  onValueChange: (id: string) => void;
  reasoningEffort?: ReasoningEffort;
  onReasoningEffortChange?: (value: ReasoningEffort) => void;
  disabled?: boolean;
};

function BaseModelSelector({
  provider,
  onProviderChange,
  value,
  onValueChange,
  reasoningEffort,
  onReasoningEffortChange,
  disabled = false,
}: BaseModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [envKeysOpen, setEnvKeysOpen] = useState(false);
  const { openAiModels, providerItems, allProviders } = useModels();

  const handleSelect = useCallback(
    (targetProvider: string, id: string) => {
      if (targetProvider !== provider) {
        onProviderChange(targetProvider as Provider);
      }
      onValueChange(id);

      if (targetProvider === 'openai') {
        const selected = openAiModels.find((m) => m.id === id);
        if (selected && onReasoningEffortChange) {
          onReasoningEffortChange(selected.defaultReasoningEffort);
        }
      } else if (onReasoningEffortChange && (!reasoningEffort || !GENERIC_REASONING_OPTIONS.includes(reasoningEffort))) {
        onReasoningEffortChange('medium');
      }
      setOpen(false);
    },
    [onValueChange, onProviderChange, provider, openAiModels, onReasoningEffortChange, reasoningEffort],
  );

  const currentItems = providerItems(provider);
  const activeItem = currentItems.find((m) => m.id === value);
  const activeLabel = activeItem?.label ? provider === 'openai' ? activeItem.label : `${provider}: ${activeItem.label}` : value ? `${provider}: ${value}` : 'Select model';

  const selectedOpenAiModel = provider === 'openai' ? openAiModels.find((m) => m.id === value) : undefined;
  const openAiReasoningOptions = selectedOpenAiModel?.supportedReasoningEfforts ?? [];
  const canSelectReasoning = provider === 'openai' ? openAiReasoningOptions.length > 0 : true;

  return (
    <div className="flex items-center">
      <div className="inline-flex items-center rounded-md border border-transparent transition-all hover:border-input hover:bg-accent/50">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-0" disabled={disabled}>
              <span className="text-xs">{activeLabel}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-64 p-2" align="start">
            <PopoverTitle className='flex justify-bewteen'>
              <Input placeholder="Search..." />
              <Button variant="ghost" size="icon" onClick={() => setEnvKeysOpen(true)}>
                <Settings className='h-4 w-4' />
              </Button>
            </PopoverTitle>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1 subtle-scrollbar">
              {allProviders.map((p) => {
                const items = providerItems(p);
                return (
                  <div key={p} className="space-y-1">
                    <div className="px-2 text-[10px] font-bold tracking-wider text-muted-foreground/60 select-none">
                      {p}
                    </div>
                    <ModelList
                      items={items}
                      selectedId={p === provider ? value : undefined}
                      onSelect={(id) => handleSelect(p, id)}
                    />
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {reasoningEffort !== undefined && onReasoningEffortChange && (
          <Select
            value={reasoningEffort}
            onValueChange={(v) => onReasoningEffortChange(v as ReasoningEffort)}
            disabled={disabled || !value || !canSelectReasoning}
          >
            <SelectTrigger className="h-8 w-fit border-none shadow-none focus:ring-0">
              <SelectValue placeholder="Default">{reasoningEffort}</SelectValue>
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
      <EnvKeysDialog open={envKeysOpen} onOpenChange={setEnvKeysOpen} />
    </div>
  );
}

export function ModelReasonSelector() {
  const { currentThreadId } = useCodexStore();
  const { openAiModels } = useModels();

  const {
    modelProvider,
    providerModels,
    setModel,
    setModelProvider,
    reasoningEffort,
    setReasoningEffort,
  } = useConfigStore();

  useEffect(() => {
    if (modelProvider === 'openai' && !providerModels['openai'] && openAiModels.length > 0) {
      const defaultModel = openAiModels.find((m) => m.isDefault) ?? openAiModels[0];
      setModel(defaultModel.id);
      setReasoningEffort(defaultModel.defaultReasoningEffort);
    }
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
    />
  );
}

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

  return (
    <BaseModelSelector
      provider={provider}
      onProviderChange={onProviderChange}
      value={value}
      onValueChange={onValueChange}
      reasoningEffort={reasoningEffort}
      onReasoningEffortChange={onReasoningEffortChange}
      disabled={disabled}
    />
  );
}