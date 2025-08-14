import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Settings, PanelLeftClose, PanelLeftOpen, Activity } from 'lucide-react';
import { CodexConfig } from '../types/codex';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ConfigIndicatorProps {
  config: CodexConfig;
  onOpenConfig: () => void;
  isSessionListVisible: boolean;
  onToggleSessionList: () => void;
  isNotesListVisible: boolean;
  onToggleNotesList: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showSessionManager?: boolean;
  onToggleSessionManager?: () => void;
}

export const ConfigIndicator: React.FC<ConfigIndicatorProps> = ({
  config,
  onOpenConfig,
  isSessionListVisible,
  onToggleSessionList,
  isNotesListVisible,
  onToggleNotesList,
  activeTab,
  onTabChange,
  onToggleSessionManager,
}) => {
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

  const handleToggleLeftPanel = () => {
    if (activeTab === 'chat') {
      onToggleSessionList();
    } else if (activeTab === 'notes') {
      onToggleNotesList();
    }
  };

  const isLeftPanelVisible = activeTab === 'chat' ? isSessionListVisible : isNotesListVisible;

  return (
    <div className="flex items-center justify-between">
      <span className="flex">
        {/* Toggle button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleLeftPanel}
          className="h-7 px-2"
        >
          {isLeftPanelVisible ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </Button>
      
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="chat">chat</TabsTrigger>
            <TabsTrigger value="notes">notes</TabsTrigger>
          </TabsList>
        </Tabs>
      </span>

      <div className="flex items-center gap-2">
        {/* Model */}
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            {config.model}
          </Badge>
        </div>

        {/* Provider */}
        <Badge className={`text-xs ${getProviderColor(config.provider)}`}>
          {config.provider.toUpperCase()}
          {config.useOss}
        </Badge>

        {/* Sandbox */}
        <Badge className={`text-xs ${getSandboxColor(config.sandboxMode)}`}>
          {config.sandboxMode.replace('-', ' ').toUpperCase()}
        </Badge>

        {/* Session Manager Button */}
        {onToggleSessionManager && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSessionManager}
            className="h-7 px-2"
            title="Active Sessions - Kill active sessions"
          >
            <Activity className="w-4 h-4" />
          </Button>
        )}
        
        {/* Settings Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenConfig}
          className="h-7 px-2"
          title="Configuration Settings"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};