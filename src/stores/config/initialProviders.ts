import { ProviderStateModelProvider } from "./useProviderStore";

export const initialProviders: ProviderStateModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: ["gpt-5", "gpt-5-codex"],
    apiKey: "",
    envKey: "",
    baseUrl: "",
  },
  {
    id: "ollama",
    name: "Ollama",
    models: [],
    apiKey: "",
    envKey: "",
    baseUrl: "http://localhost:11434/v1",
  },
  {
    id: "google",
    name: "Google",
    models: ["gemini-2.5-pro", "gemini-2.5-flash"],
    apiKey: "",
    envKey: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: ["openai/gpt-oss-20b:free", "qwen/qwen3-coder:free"],
    apiKey: "",
    envKey: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
  },
  {
    id: "hf",
    name: "Huggingface",
    models: ["openai/gpt-oss-20b"],
    apiKey: "",
    envKey: "HF_API_TOKEN",
    baseUrl: "https://router.huggingface.co/v1",
  },
  {
    id: "xai",
    name: "grok",
    models: ["grok-4"],
    apiKey: "",
    envKey: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
  },
];
