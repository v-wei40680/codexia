import { useEffect, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { usePromptOptimizerStore } from '@/stores/PromptOptimizerStore';
import { Provider, useProvidersStore } from '@/stores/ProvidersStore';

export function PromptOptimizerSettings() {
  const { provider, model, setProvider, setModel } = usePromptOptimizerStore();
  const providers = useProvidersStore((state) => state.providers);

  const providerKeys = Object.keys(providers) as Provider[];
  const fallbackProvider = providerKeys[0] ?? 'openai';
  const normalizedProvider = providerKeys.includes(provider as Provider)
    ? provider
    : fallbackProvider;
  const activeProvider = normalizedProvider as Provider;

  useEffect(() => {
    if (provider !== normalizedProvider) {
      setProvider(normalizedProvider);
    }
  }, [normalizedProvider, provider, setProvider]);
  const availableModels = providers[activeProvider]?.models ?? [];

  const handleProviderChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = event.target.value;
    setProvider(nextProvider);
  };

  useEffect(() => {
    if (!availableModels.includes(model)) {
      setModel(availableModels[0] ?? '');
    }
  }, [availableModels, model, setModel]);

  return (
    <Card className="max-w-3xl my-6">
      <CardHeader>
        <CardTitle>Prompt Optimization Model</CardTitle>
        <CardDescription>
          Choose the provider and model used exclusively for prompt polishing. This setting does not affect chat sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="optimizer-provider">Provider</Label>
          <select
            id="optimizer-provider"
            value={provider}
            onChange={handleProviderChange}
            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {providerKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="optimizer-model">Model</Label>
          {availableModels.length > 0 ? (
            <select
              id="optimizer-model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {availableModels.map((availableModel) => (
                <option key={availableModel} value={availableModel}>
                  {availableModel}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved models for {activeProvider}. Add one in the Provider section first.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
