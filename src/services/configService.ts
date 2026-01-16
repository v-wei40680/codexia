import { invoke } from "@/lib/tauri-proxy";
import { ModelProvider } from "@/types/config";

export class ConfigService {
  static async getAllProviders(): Promise<Record<string, ModelProvider>> {
    try {
      const result = await invoke<Record<string, ModelProvider>>(
        "read_model_providers",
      );
      return result;
    } catch (error) {
      console.error("Failed to get all providers:", error);
      return {};
    }
  }

  static async addProviderWithProfile(options: {
    providerId: string;
    providerName: string;
    baseUrl?: string;
    envKey?: string;
    model?: string;
  }): Promise<void> {
    const { providerId, providerName, baseUrl, envKey } = options;

    const providerPayload: ModelProvider = {
      name: providerName,
      base_url: baseUrl || "",
      env_key: envKey || undefined,
      requires_openai_auth: providerName.toLowerCase() === "openrouter"
    };

    await this.addOrUpdateModelProvider(providerId, providerPayload);
  }

  static async addOrUpdateModelProvider(
    providerName: string,
    provider: ModelProvider,
  ): Promise<void> {
    try {
      await invoke("add_or_update_model_provider", {
        providerName,
        provider,
      });
    } catch (error) {
      console.error(
        `Failed to add/update model provider ${providerName}:`,
        error,
      );
      throw new Error(`Failed to add/update model provider: ${error}`);
    }
  }

  static async deleteModelProvider(providerName: string): Promise<void> {
    try {
      await invoke("delete_model_provider", {
        providerName,
      });
    } catch (error) {
      console.error(`Failed to delete model provider ${providerName}:`, error);
      throw new Error(`Failed to delete model provider: ${error}`);
    }
  }
}
