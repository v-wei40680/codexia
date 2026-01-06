import { BackButton } from '@/components/common/BackButton';
import { UserConfigForm, Footer, ToolPrompt } from '@/components/dxt';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DxtManifestSchema } from './schemas';
import { useNavigationStore } from '@/stores/navigationStore';
import { useFolderStore } from '@/stores/FolderStore';
import { invoke } from '@/lib/tauri-proxy';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { MCPConfigType } from '@/types/cc-mcp';

// Helper function to validate URLs
function isValidUrl(url: any): boolean {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper function to clean user_config
function cleanUserConfig(userConfig: any): any {
  if (typeof userConfig !== 'object' || !userConfig) return {};

  const cleaned: any = {};
  for (const [key, value] of Object.entries(userConfig)) {
    if (typeof value === 'object' && value !== null) {
      // Clean up nested config objects, ensuring required fields
      const cleanedValue: any = {
        type: (value as any).type || 'string', // Default type
        title: (value as any).title || key, // Use key as title if not provided
        description: (value as any).description || `Configuration for ${key}`, // Default description
        default: (value as any).default,
        required: (value as any).required,
        multiple: (value as any).multiple,
        sensitive: (value as any).sensitive,
        min: (value as any).min,
        max: (value as any).max,
      };

      // Remove undefined values
      Object.keys(cleanedValue).forEach((k) => {
        if (cleanedValue[k] === undefined) {
          delete cleanedValue[k];
        }
      });

      cleaned[key] = cleanedValue;
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

// Add this helper function to sanitize manifest fields that may be null
function sanitizeManifest(raw: any) {
  // Clean up null values
  for (const key in raw) {
    if (raw[key] === null) raw[key] = undefined;
  }

  // Fix common data issues
  const cleaned = {
    ...raw,
    // Ensure required fields have default values
    version: raw.version || raw.dxt_version || raw.server?.version || '1.0.0', // Use various fallbacks
    tools_generated: raw.tools_generated ?? false,
    prompts_generated: raw.prompts_generated ?? false,

    // Fix invalid URLs
    homepage: isValidUrl(raw.homepage) ? raw.homepage : undefined,
    documentation: isValidUrl(raw.documentation) ? raw.documentation : undefined,
    support: isValidUrl(raw.support) ? raw.support : undefined,

    // Clean up user_config if it exists
    user_config: raw.user_config ? cleanUserConfig(raw.user_config) : undefined,
  };

  // Remove unrecognized top-level fields that might cause issues
  const allowedFields = new Set([
    'id',
    'name',
    'display_name',
    'description',
    'author',
    'homepage',
    'icon',
    'dxt_version',
    'version',
    'server',
    'tools',
    'prompts',
    'resources',
    'user_config',
    'tools_generated',
    'prompts_generated',
    'compatibility',
    'source',
    'documentation',
    'support',
    'long_description',
    'repository',
    'screenshots',
    'keywords',
    'license',
    '$schema',
  ]);

  const filtered: any = {};
  for (const [key, value] of Object.entries(cleaned)) {
    if (allowedFields.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}

export default function DxtDetail({
  user,
  repo,
  onBack,
}: {
  user: string;
  repo: string;
  onBack: () => void;
}) {
  const { selectedAgent } = useNavigationStore();
  const { currentFolder } = useFolderStore();
  const selectedClient = selectedAgent;
  const selectedPath = currentFolder;
  const [manifest, setManifest] = useState<z.infer<typeof DxtManifestSchema> | null>(null);
  const [userConfig, setUserConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // First useEffect: load manifest
  useEffect(() => {
    if (!user || !repo) {
      console.log('Missing user or repo:', { user, repo });
      return;
    }

    console.log('Loading manifest for:', { user, repo });
    setLoading(true);

    invoke<any>('load_manifest', { user, repo })
      .then((found) => {
        console.log('Manifest loaded:', found);
        if (found) {
          try {
            const sanitized = sanitizeManifest(found);
            console.log('Sanitized manifest:', sanitized);
            const parsed = DxtManifestSchema.parse(sanitized);
            setManifest(parsed);
          } catch (e) {
            console.error('Failed to parse manifest:', e, found);
            setManifest(null);
          }
        } else {
          console.log('No manifest found for:', { user, repo });
          setManifest(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load manifest:', err, { user, repo });
        setManifest(null);
        setLoading(false);
      });
  }, [user, repo]);

  // Second useEffect: check mcpServers after manifest is loaded
  useEffect(() => {
    if (!manifest) return;
    invoke<MCPConfigType>('read_json_file', {
      clientName: selectedClient,
      path: selectedPath,
    }).then((savedData) => {
      const hasServer = !!savedData.mcpServers?.[manifest.name];
      setIsInstalled(hasServer);
      console.log('get mcpServers', savedData.mcpServers[manifest.name]);
    });
  }, [manifest, selectedClient, selectedPath]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!manifest) return <div className="p-4">Not found</div>;

  const userConfigSchema = manifest.user_config ?? {};

  // Helper to merge userConfig into mcp_config
  function getMergedMcpConfig() {
    const baseConfig = JSON.parse(JSON.stringify(manifest?.server.mcp_config || {}));
    // If there's an env object, update it with matching userConfig keys
    if (baseConfig.env && typeof baseConfig.env === 'object') {
      for (const [k, v] of Object.entries(userConfig)) {
        if (k in baseConfig.env) {
          baseConfig.env[k] = v;
        } else {
          baseConfig[k] = v;
        }
      }
    } else {
      // No env object, just shallow merge
      Object.assign(baseConfig, userConfig);
    }
    return baseConfig;
  }

  async function addMcpConfig() {
    const mergedConfig = getMergedMcpConfig();
    const _item = {
      clientName: selectedClient,
      path: selectedPath || undefined,
      serverName: manifest?.name,
      serverConfig: mergedConfig,
    };
    console.log(_item);
    invoke('add_mcp_server', _item);
  }

  async function removeMcp() {
    invoke('remove_mcp_server', {
      clientName: selectedClient,
      path: selectedPath || undefined,
      serverName: manifest?.name,
    });
  }

  async function changeStatus(checked: boolean) {
    setEnabled(checked);
    const mergedConfig = getMergedMcpConfig();
    const mcpServerConfig = { [manifest?.name as string]: mergedConfig };
    console.log(mcpServerConfig);
    if (checked) {
      invoke('disable_mcp_server', {
        clientName: selectedClient,
        path: selectedPath || undefined,
        serverName: manifest?.name,
      });
    } else {
      const _serverItem = {
        clientName: selectedClient,
        path: selectedPath || '',
        serverName: manifest?.name,
      };
      try {
        await invoke('enable_mcp_server', _serverItem);
      } catch (error) { }
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton onClick={onBack} />
      {/* Top section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">{manifest.display_name ?? manifest.name}</h1>
          <p className="text-gray-700 dark:text-gray-300 mb-1">{manifest.description}</p>
        </div>
        {!isInstalled && (
          <button
            onClick={addMcpConfig}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded shadow"
          >
            Install
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <span>
          <Switch onCheckedChange={changeStatus} checked={enabled} />{' '}
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
        <Button onClick={removeMcp}>Uninstall</Button>
      </div>

      {/* User config form */}
      {Object.keys(userConfigSchema).length > 0 && (
        <div className="mb-8 rounded">
          <h2 className="text-lg font-semibold mb-2">User Configuration</h2>
          <UserConfigForm
            schema={userConfigSchema}
            values={userConfig}
            onChange={(k, v) => setUserConfig((prev) => ({ ...prev, [k]: v }))}
          />
        </div>
      )}

      {/* Middle section: tools & prompts */}
      <ToolPrompt manifest={manifest} />

      <Footer manifest={manifest} />
    </div>
  );
}
