import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Provider = "openai" | "google" | "ollama" | "openrouter" | "xai";

type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
  models: string[];
};

type Providers = Record<Provider, ProviderConfig>;

interface ProvidersStore {
  providers: Providers;
  setProviderApiKey: (provider: Provider, key: string) => void;
  setProviderBaseUrl: (provider: Provider, url: string) => void;
  setProviderModels: (provider: Provider, models: string[]) => void;
  defaultProvider: Provider;
  setDefaultProvider: (provider: Provider) => void;
}

const DEFAULT_PROVIDERS: Providers = {
  openai: {
    apiKey: "",
    baseUrl: "",
    models: ["gpt-5", "gpt-4o", "gpt-4o-mini"],
  },
  ollama: {
    apiKey: "",
    baseUrl: "http://localhost:11434/v1",
    models: ["gpt-oss:20b", "mistral", "qwen3", "deepseek-r1", "llama3.2", "gemma3"],
  },
  google: {
    apiKey: "",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  openrouter: {
    apiKey: "",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-opus-4.1",
      "anthropic/claude-opus-4",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-oss-20b:free",
      "x-ai/grok-code-fast-1",
      "qwen/qwen3-coder:free",
      "moonshotai/kimi-k2:free"
    ],
  },
  xai: {
    apiKey: "",
    baseUrl: "https://api.x.ai/v1",
    models: ["grok-code-fast-1", "grok-4"]
  }
};

export const useProvidersStore = create<ProvidersStore>()(
  persist(
    (set) => ({
      providers: { ...DEFAULT_PROVIDERS },
      defaultProvider: "openai",
      setProviderApiKey: (provider: Provider, key: string) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], apiKey: key },
          },
        })),
      setProviderBaseUrl: (provider: Provider, url: string) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], baseUrl: url },
          },
        })),
      setProviderModels: (provider: Provider, models: string[]) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], models },
          },
        })),
      setDefaultProvider: (provider: Provider) =>
        set({ defaultProvider: provider }),
    }),
    {
      name: "providers-storage",
    },
  ),
);