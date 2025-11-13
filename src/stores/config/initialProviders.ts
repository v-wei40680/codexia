import { ProviderStateModelProvider } from "./useProviderStore";

export const initialProviders: ProviderStateModelProvider[] = [
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
    baseUrl: "http://localhost:11434/v1",
  },
  {
    id: "google",
    name: "Google",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    apiKey: "",
    apiKeyVar: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
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
  {
    id: "xai",
    name: "grok",
    models: ["grok-4"],
    apiKey: "",
    apiKeyVar: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
  },
];
