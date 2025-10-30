export interface ModelProvider {
  name: string;
  base_url: string;
  env_key: string;
}

export interface Profile {
  provider_id: string;
  model_id: string;
  api_key?: string;
  api_key_env?: string;
  base_url?: string;
}

export interface ProviderConfig {
  provider: ModelProvider;
  profile?: Profile;
}