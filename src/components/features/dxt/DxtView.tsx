import { DxtCard } from './DxdCard';
import { DxtManifestSchema } from './schemas';
import DxtDetail from './DxtDetail';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, RotateCcw } from 'lucide-react';

// Utility to normalize manifest data
function normalizeManifest(obj: any, index: number) {
  // Clean up null values
  for (const key in obj) {
    if (obj[key] === null) obj[key] = undefined;
  }

  // Fix common data issues
  const cleaned = {
    id: index,
    ...obj,
    // Ensure required fields have default values
    version: obj.version || obj.dxt_version || obj.server?.version || '1.0.0', // Use various fallbacks
    tools_generated: obj.tools_generated ?? false,
    prompts_generated: obj.prompts_generated ?? false,

    // Fix invalid URLs
    homepage: isValidUrl(obj.homepage) ? obj.homepage : undefined,
    documentation: isValidUrl(obj.documentation) ? obj.documentation : undefined,
    support: isValidUrl(obj.support) ? obj.support : undefined,

    // Clean up user_config if it exists
    user_config: obj.user_config ? cleanUserConfig(obj.user_config) : undefined,
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

export default function DxtView() {
  const [dxtList, setDxtList] = useState<z.infer<typeof DxtManifestSchema>[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDxt, setSelectedDxt] = useState<{ user: string; repo: string } | null>(null);

  // Load manifests from file system
  useEffect(() => {
    initializeManifests();
  }, []);

  async function initializeManifests() {
    setLoading(true);
    try {
      // Check if manifests exist locally
      const manifestsExist = await invoke<boolean>('check_manifests_exist');

      if (!manifestsExist) {
        console.log('No manifests found locally, downloading...');
        // Download and extract manifests if they don't exist
        await invoke('download_and_extract_manifests');
      }

      // Load manifests
      await loadManifests();
    } catch (err) {
      console.error('Failed to initialize manifests:', err);
      setDxtList([]);
      setLoading(false);
    }
  }

  async function loadManifests() {
    try {
      const result = await invoke<any[]>('load_manifests');
      const normalized = result.map((manifest, index) => normalizeManifest(manifest, index));

      // Parse each manifest individually and filter out invalid ones
      const validManifests: any[] = [];
      normalized.forEach((manifest, index) => {
        try {
          const parsed = DxtManifestSchema.parse(manifest);
          validManifests.push(parsed);
        } catch (parseError) {
          console.warn(`Skipping invalid manifest at index ${index}:`, parseError, manifest);
        }
      });

      console.log(
        `Successfully loaded ${validManifests.length} out of ${normalized.length} manifests`
      );

      if (validManifests.length === 0 && normalized.length > 0) {
        console.error('All manifests failed validation. This might indicate a schema mismatch.');
        // Try to show at least the raw data for debugging
        console.log('Sample raw manifest:', normalized[0]);
      }

      setDxtList(validManifests);
    } catch (err) {
      console.error('Failed to load manifests:', err);
      setDxtList([]);
    } finally {
      setLoading(false);
    }
  }

  // Search function - filter locally
  async function handleSearch() {
    if (search.trim() === '') {
      await loadManifests();
    } else {
      try {
        const result = await invoke<any[]>('load_manifests');
        const filtered = result.filter(
          (manifest) =>
            manifest.name?.toLowerCase().includes(search.toLowerCase()) ||
            manifest.display_name?.toLowerCase().includes(search.toLowerCase()) ||
            manifest.description?.toLowerCase().includes(search.toLowerCase())
        );
        const normalized = filtered.map((manifest, index) => normalizeManifest(manifest, index));

        // Parse each manifest individually and filter out invalid ones
        const validManifests: any[] = [];
        normalized.forEach((manifest, index) => {
          try {
            const parsed = DxtManifestSchema.parse(manifest);
            validManifests.push(parsed);
          } catch (parseError) {
            console.warn(
              `Skipping invalid manifest in search at index ${index}:`,
              parseError,
              manifest
            );
          }
        });

        setDxtList(validManifests);
      } catch (err) {
        console.error('Failed to search manifests:', err);
      }
    }
  }

  // Show detail view if a DXT is selected
  if (selectedDxt) {
    return (
      <DxtDetail
        user={selectedDxt.user}
        repo={selectedDxt.repo}
        onBack={() => setSelectedDxt(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {/* loading indicator */}
          {loading && (
            <div className="mb-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Loading manifests...</div>
            </div>
          )}
          {/* action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 pr-10 h-10"
                placeholder="Search extensions by name, author or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={async () => {
                    setSearch('');
                    await loadManifests();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button className="flex-1 sm:flex-none h-10 px-6 font-medium" onClick={handleSearch}>
                Search
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                title="Reload extensions"
                onClick={initializeManifests}
                disabled={loading}
              >
                <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {/* Grid layout for DXT cards */}
          <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {dxtList.map((dxt, idx) => {
              const getUserRepo = () => {
                const user = dxt.author?.name || 'unknown';
                const repo = dxt.name || 'unknown';
                return { user, repo };
              };
              const { user, repo } = getUserRepo();

              return <DxtCard key={idx} dxt={dxt} onClick={() => setSelectedDxt({ user, repo })} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
