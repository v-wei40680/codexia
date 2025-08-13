import React, { useState, useEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Settings, Folder, Bot, Server } from 'lucide-react';
import { CodexConfig } from '../types/codex';
import { sessionManager } from '../services/sessionManager';

interface ConfigIndicatorProps {
  config: CodexConfig;
  onOpenConfig: () => void;
}

export const ConfigIndicator: React.FC<ConfigIndicatorProps> = ({
  config,
  onOpenConfig,
}) => {
  const [runningSessionsCount, setRunningSessionsCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setRunningSessionsCount(sessionManager.getRunningSessions().length);
    };

    // Update immediately
    updateCount();

    // Update every 2 seconds
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800';
      case 'oss': return 'bg-blue-100 text-blue-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSandboxColor = (mode: string) => {
    switch (mode) {
      case 'read-only': return 'bg-green-100 text-green-800';
      case 'workspace-write': return 'bg-yellow-100 text-yellow-800';
      case 'danger-full-access': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border-b bg-gray-50 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          {/* Working Directory */}
          <div className="flex items-center gap-1">
            <Folder className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600 font-mono text-xs">
              {config.workingDirectory.split('/').slice(-2).join('/')}
            </span>
          </div>

          {/* Model */}
          <div className="flex items-center gap-1">
            <Bot className="w-4 h-4 text-gray-500" />
            <Badge variant="secondary" className="text-xs">
              {config.model}
            </Badge>
          </div>

          {/* Provider */}
          <Badge className={`text-xs ${getProviderColor(config.provider)}`}>
            {config.provider.toUpperCase()}
            {config.useOss && ' (OSS)'}
          </Badge>

          {/* Sandbox */}
          <Badge className={`text-xs ${getSandboxColor(config.sandboxMode)}`}>
            {config.sandboxMode.replace('-', ' ').toUpperCase()}
          </Badge>

          {/* Approval */}
          <Badge variant="outline" className="text-xs">
            {config.approvalPolicy.replace('-', ' ').toUpperCase()}
          </Badge>

          {/* Running Sessions Count */}
          {runningSessionsCount > 0 && (
            <div className="flex items-center gap-1">
              <Server className="w-4 h-4 text-gray-500" />
              <Badge variant="default" className="text-xs">
                {runningSessionsCount} Running
              </Badge>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenConfig}
          className="h-7 px-2"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};