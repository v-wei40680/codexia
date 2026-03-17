import { useCCStore } from '@/stores';
import type { ModelType } from '@/stores/cc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ModelSelector() {
  const { options, updateOptions } = useCCStore();
  const { model } = options;

  const handleModelChange = (value: string) => {
    const modelValue = value as ModelType | undefined;
    updateOptions({ model: modelValue });
  };

  return (
    <div className="flex gap-2 items-center">
      <Select value={model ?? ''} onValueChange={handleModelChange}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default" className="text-xs">
            Auto
          </SelectItem>
          <SelectItem value="sonnet">Sonnet</SelectItem>
          <SelectItem value="haiku">Haiku</SelectItem>
          <SelectItem value="opus">Opus</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
