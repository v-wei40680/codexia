import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { useSettingsStore } from '@/stores/SettingsStore';
import { useModelStore } from '@/stores/ModelStore';
import { ConfigService } from '@/services/configService';

export const ModelSelector: React.FC = () => {
  const { providers } = useSettingsStore();
  const { currentModel, currentProvider, setCurrentModel } = useModelStore();
  const [modelsByProvider, setModelsByProvider] = useState<Record<string, Array<{model: string, source: 'settings' | 'config'}>>>({});
  const [isModelPopoverOpen, setIsModelPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load available models grouped by provider
  useEffect(() => {
    const loadModelsByProvider = async () => {
      const providerModels: Record<string, Array<{model: string, source: 'settings' | 'config'}>> = {};
      
      // Add models from settings store
      Object.entries(providers).forEach(([providerName, providerConfig]) => {
        const normalizedProvider = providerName.toLowerCase();
        if (!providerModels[normalizedProvider]) {
          providerModels[normalizedProvider] = [];
        }
        
        if (providerConfig?.models) {
          providerConfig.models.forEach(model => {
            // Check for duplicates within the same provider
            const exists = providerModels[normalizedProvider].some(m => m.model === model);
            if (!exists) {
              providerModels[normalizedProvider].push({
                model,
                source: 'settings'
              });
            }
          });
        }
      });
      
      // Add models from config.toml profiles
      try {
        const profiles = await ConfigService.getAllProfiles();
        Object.entries(profiles).forEach(([, profile]) => {
          const normalizedProvider = profile.model_provider.toLowerCase();
          if (!providerModels[normalizedProvider]) {
            providerModels[normalizedProvider] = [];
          }
          
          // Check for duplicates within the same provider
          const exists = providerModels[normalizedProvider].some(m => m.model === profile.model);
          if (!exists) {
            providerModels[normalizedProvider].push({
              model: profile.model,
              source: 'config'
            });
          }
        });
      } catch (error) {
        console.error('Failed to load config.toml profiles:', error);
      }
      
      setModelsByProvider(providerModels);
    };
    
    loadModelsByProvider();
  }, [providers]);

  // Helper function to determine if provider should use OSS
  const shouldUseOss = (provider: string) => {
    return provider.toLowerCase() !== 'openai';
  };

  // Filter models based on search term
  const filteredModelsByProvider = useMemo(() => {
    if (!searchTerm.trim()) {
      return modelsByProvider;
    }

    const filtered: typeof modelsByProvider = {};
    const lowerSearchTerm = searchTerm.toLowerCase();

    Object.entries(modelsByProvider).forEach(([providerName, models]) => {
      // Check if provider name matches search term
      const providerMatches = providerName.toLowerCase().includes(lowerSearchTerm);
      
      // Filter models that match search term
      const matchingModels = models.filter(modelInfo => 
        modelInfo.model.toLowerCase().includes(lowerSearchTerm)
      );

      // Include provider if provider name matches OR if it has matching models
      if (providerMatches || matchingModels.length > 0) {
        filtered[providerName] = providerMatches ? models : matchingModels;
      }
    });

    return filtered;
  }, [modelsByProvider, searchTerm]);

  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
      <Popover open={isModelPopoverOpen} onOpenChange={(open) => {
        setIsModelPopoverOpen(open);
        if (!open) {
          setSearchTerm('');
        }
      }}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-100">
              {currentProvider}/{currentModel}
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-3" align="end">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Select Model</h4>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-gray-500" />
              <Input
                placeholder="Search models..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-3">
              {Object.keys(filteredModelsByProvider).length === 0 ? (
                <p className="text-xs text-gray-500 py-2">
                  {searchTerm.trim() ? 'No models found matching your search' : 'No models available'}
                </p>
              ) : (
                Object.entries(filteredModelsByProvider).map(([providerName, models]) => (
                  <div key={providerName} className="space-y-1">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <h5 className="font-medium text-xs text-gray-700 uppercase tracking-wide">
                        {providerName}
                      </h5>
                      <div className="flex-1 border-t border-gray-200"></div>
                      {shouldUseOss(providerName) && (
                        <Badge variant="outline" className="text-xs">
                          --oss
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {models.map((modelInfo, index) => (
                        <Button
                          key={`${providerName}-${modelInfo.model}-${index}`}
                          variant={currentModel === modelInfo.model && currentProvider.toLowerCase() === providerName ? "default" : "ghost"}
                          className="w-full justify-start text-left h-auto p-2"
                          onClick={() => {
                            setCurrentModel(modelInfo.model, providerName);
                            setIsModelPopoverOpen(false);
                          }}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium text-sm">{modelInfo.model}</span>
                            <Badge 
                              variant={modelInfo.source === 'config' ? 'default' : 'secondary'} 
                              className="text-xs"
                            >
                              {modelInfo.source === 'config' ? 'config' : 'settings'}
                            </Badge>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                💡 Add more models in Settings or edit ~/.codex/config.toml
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <div></div>
    </div>
  );
};