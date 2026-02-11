import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listModels } from '@/services/tauri';
import type { Model } from '@/bindings/v2';
import type { ReasoningEffort } from '@/bindings';
import { useEffect, useState } from 'react';
import { useConfigStore } from '@/stores/codex';

export function ModelReasonSelector() {
  const [models, setModels] = useState<Model[]>([]);
  const { model, setModel, reasoningEffort, setReasoningEffort } = useConfigStore();

  useEffect(() => {
    async function getModels() {
      const response = await listModels();
      setModels(response.data);

      if (response.data.length > 0 && !model) {
        const defaultModel = response.data.find((m) => m.isDefault) || response.data[0];
        setModel(defaultModel.id);
        setReasoningEffort(defaultModel.defaultReasoningEffort);
      }
    }
    getModels();
  }, []);

  const selectedModel = models.find((m) => m.id === model);
  const reasoningOptions = selectedModel?.supportedReasoningEfforts || [];

  const onSelectModel = (value: string) => {
    setModel(value);
    const model = models.find((m) => m.id === value);
    if (model) {
      setReasoningEffort(model.defaultReasoningEffort);
    }
  };

  const onSelectEffort = (value: string) => {
    setReasoningEffort(value as ReasoningEffort);
  };

  return (
    <div className="flex items-center">
      <div className="inline-flex items-center gap-2 px-2 rounded-md border border-transparent hover:border-input hover:bg-accent/50 transition-all w-max group">
        <Select value={model ?? ''} onValueChange={onSelectModel} disabled={models.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder="No models">{model?.replace(/gpt-/g, ' ')}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {models.length === 0 ? (
              <SelectItem value="__no_models__" disabled>
                No models
              </SelectItem>
            ) : (
              models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col gap-0.5">
                    <span>{model.displayName || model.model}</span>
                    <span className="text-[10px] text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Select
          value={reasoningEffort ?? ''}
          onValueChange={onSelectEffort}
          disabled={reasoningOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Default">
              {reasoningEffort?.slice(0, 1).toUpperCase()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {reasoningOptions.length === 0 ? (
              <SelectItem value="__default__" disabled>
                Default
              </SelectItem>
            ) : (
              reasoningOptions.map((option) => (
                <SelectItem key={option.reasoningEffort} value={option.reasoningEffort}>
                  <div className="flex flex-col gap-0.5">
                    <span>{option.reasoningEffort}</span>
                    <span className="text-[10px] text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
