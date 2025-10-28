import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ModelProvider {
  id: string;
  name: string;
  models: string[];
  apiKey: string;
  apiKeyVar?: string;
  baseUrl?: string;
}

type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

type ProviderState = {
  providers: ModelProvider[];
  selectedProviderId: string | null;
  selectedModel: string | null;
  reasoningEffort: ReasoningEffort;
};

type ProviderActions = {
  addProvider: (provider: { name: string; models: string[] }) => void;
  setApiKey: (id: string, key: string) => void;
  setApiKeyVar: (id: string, keyVar: string) => void;
  setBaseUrl: (id: string, baseUrl: string) => void;
  setSelectedProviderId: (id: string) => void;
  setSelectedModel: (model: string) => void;
  addModel: (providerId: string, model: string) => void;
  deleteModel: (providerId: string, model: string) => void;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  setOllamaModels: (models: string[]) => void;
};



const initialProviders: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-5", "gpt-5-codex"],
    apiKey: "",
    apiKeyVar: "",
    baseUrl: "",
  },
  {
    id: "ollama",
    name: "Ollama",
    models: [],
    apiKey: "",
    apiKeyVar: "",
    baseUrl: "",
  },
  {
    id: "google",
    name: "Google",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    apiKey: "",
    apiKeyVar: "GEMINI_API_KEY",
    baseUrl: "",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: ["openai/gpt-oss-20b:free", "qwen/qwen3-coder:free"],
    apiKey: "",
    apiKeyVar: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "hf",
    name: "Huggingface",
    models: ["openai/gpt-oss-20b"],
    apiKey: "",
    apiKeyVar: "HF_API_TOKEN",
    baseUrl: "https://router.huggingface.co/v1",
  },
];

export const useProviderStore = create<ProviderState & ProviderActions>()(
  persist(
    (set, get) => ({
      providers: initialProviders,
      selectedProviderId: initialProviders[0].id,
      selectedModel: initialProviders[0].models[0],
      reasoningEffort: 'medium',

      setSelectedProviderId: (id: string) => {
        const provider = get().providers.find((p) => p.id === id);
        if (provider) {
          set({
            selectedProviderId: id,
            selectedModel: provider.models[0] ?? null,
          });
        }
      },
      setSelectedModel: (model) => set({ selectedModel: model }),
      setApiKey: (id, key) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, apiKey: key } : p,
          ),
        }));
      },
      setApiKeyVar: (id, keyVar) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, apiKeyVar: keyVar } : p,
          ),
        }));
      },
      setBaseUrl: (id, baseUrl) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, baseUrl: baseUrl } : p,
          ),
        }));
      },
      addProvider: (providerData) => {
        const newProvider: ModelProvider = {
          ...providerData,
          id: providerData.name.toLowerCase().replace(/\s+/g, "-"),
          apiKey: "",
          apiKeyVar: "",
          baseUrl: "",
        };
        set((state) => ({
          providers: [...state.providers, newProvider],
        }));
      },
      addModel: (providerId, model) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId ? { ...p, models: [...p.models, model] } : p,
          ),
        }));
      },
      setReasoningEffort: (effort) => set({ reasoningEffort: effort }),
      setOllamaModels: (models: string[]) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === "ollama" ? { ...p, models: models } : p,
          ),
        }));
      },
      deleteModel: (providerId, modelToDelete) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === providerId
              ? { ...p, models: p.models.filter((m) => m !== modelToDelete) }
              : p,
          ),
        }));
      },    }),
    {
      name: "provider"
    },
  ),
);
