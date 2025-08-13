import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Settings, Folder, X } from 'lucide-react';
import { CodexConfig, DEFAULT_CONFIG } from '../types/codex';

interface ConfigDialogProps {
  isOpen: boolean;
  config: CodexConfig;
  onClose: () => void;
  onSave: (config: CodexConfig) => void;
}

export const ConfigDialog: React.FC<ConfigDialogProps> = ({
  isOpen,
  config,
  onClose,
  onSave,
}) => {
  const [localConfig, setLocalConfig] = useState<CodexConfig>(config);

  if (!isOpen) return null;

  const handleSelectDirectory = async () => {
    try {
      const result = await invoke<string | null>('select_directory');
      if (result) {
        setLocalConfig(prev => ({ ...prev, workingDirectory: result }));
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CONFIG);
  };

  const updateConfig = (field: keyof CodexConfig, value: any) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Codex Configuration</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Working Directory */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Working Directory</label>
            <div className="flex gap-2">
              <Input
                value={localConfig.workingDirectory}
                onChange={(e) => updateConfig('workingDirectory', e.target.value)}
                placeholder="/path/to/project"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleSelectDirectory}
                className="flex items-center gap-2"
              >
                <Folder className="w-4 h-4" />
                Browse
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Directory where codex will run and execute commands
            </p>
          </div>

          {/* Model Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Model Settings</h3>
            
            {/* Provider */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <div className="flex gap-2">
                {['openai', 'oss', 'custom'].map((provider) => (
                  <Button
                    key={provider}
                    variant={localConfig.provider === provider ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig('provider', provider)}
                  >
                    {provider.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Use OSS */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useOss"
                checked={localConfig.useOss}
                onChange={(e) => updateConfig('useOss', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="useOss" className="text-sm font-medium">
                Use OSS (--oss flag)
              </label>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Model</label>
              <Input
                value={localConfig.model}
                onChange={(e) => updateConfig('model', e.target.value)}
                placeholder="llama3.2, gpt-4, etc."
              />
              <p className="text-xs text-gray-500">
                Model name (e.g., llama3.2 for OSS, gpt-4 for OpenAI)
              </p>
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Security Settings</h3>
            
            {/* Approval Policy */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Approval Policy</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'untrusted', label: 'Untrusted' },
                  { value: 'on-failure', label: 'On Failure' },
                  { value: 'on-request', label: 'On Request' },
                  { value: 'never', label: 'Never' },
                ].map((policy) => (
                  <Button
                    key={policy.value}
                    variant={localConfig.approvalPolicy === policy.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig('approvalPolicy', policy.value)}
                  >
                    {policy.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sandbox Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sandbox Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'read-only', label: 'Read Only' },
                  { value: 'workspace-write', label: 'Workspace Write' },
                  { value: 'danger-full-access', label: 'Full Access' },
                ].map((mode) => (
                  <Button
                    key={mode.value}
                    variant={localConfig.sandboxMode === mode.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig('sandboxMode', mode.value)}
                  >
                    {mode.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Arguments */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Custom Arguments (Advanced)</label>
            <Input
              value={localConfig.customArgs?.join(' ') || ''}
              onChange={(e) => updateConfig('customArgs', e.target.value.split(' ').filter(arg => arg.trim()))}
              placeholder="--config foo=bar --profile dev"
            />
            <p className="text-xs text-gray-500">
              Additional command-line arguments for codex
            </p>
          </div>

          {/* Current Config Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Command Preview</label>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              codex proto
              {localConfig.useOss && ' --oss'}
              {localConfig.model && ` -m ${localConfig.model}`}
              {localConfig.approvalPolicy && ` -a ${localConfig.approvalPolicy}`}
              {localConfig.sandboxMode && ` -s ${localConfig.sandboxMode}`}
              {localConfig.workingDirectory && ` -C "${localConfig.workingDirectory}"`}
              {localConfig.customArgs && localConfig.customArgs.length > 0 && ` ${localConfig.customArgs.join(' ')}`}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};