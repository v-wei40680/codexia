import { useCCStore, PermissionMode } from '@/stores/ccStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { X, Server, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { CCMCPManager } from './mcp';
import { ccGetInstalledSkills, ccGetSettings, ccUpdateSettings } from '@/services';

export function CCFooter() {
  const { options, updateOptions } = useCCStore();
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<Record<string, boolean>>({});
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        // Load installed skills
        const skills = await ccGetInstalledSkills();
        setInstalledSkills(skills);

        // Load global settings to get enabled skills
        const settings = await ccGetSettings<any>();
        setEnabledSkills(settings.enabledSkills || {});
      } catch (error) {
        console.error('Failed to load skills:', error);
      }
    };
    loadSkills();
  }, []);

  const toggleSkill = async (skill: string) => {
    try {
      const newEnabledSkills = {
        ...enabledSkills,
        [skill]: !enabledSkills[skill],
      };
      setEnabledSkills(newEnabledSkills);

      // Update global settings
      const settings = await ccGetSettings<any>();
      settings.enabledSkills = newEnabledSkills;
      await ccUpdateSettings(settings);
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  };

  const enabledSkillCount = Object.values(enabledSkills).filter(Boolean).length;

  return (
    <Card className="shrink-0 border-t p-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Permission</Label>
          <Select
            value={options.permissionMode}
            onValueChange={(value) => updateOptions({ permissionMode: value as PermissionMode })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Ask Permission</SelectItem>
              <SelectItem value="acceptEdits">Accept Edits</SelectItem>
              <SelectItem value="plan">Plan Mode</SelectItem>
              <SelectItem value="bypassPermissions">Bypass All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Max Turns</Label>
          <div className="relative">
            <Input
              type="number"
              min="1"
              max="100"
              placeholder="Auto"
              value={options.maxTurns ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                updateOptions({ maxTurns: value === '' ? undefined : parseInt(value) });
              }}
              className="h-8 text-xs pr-8"
            />
            {options.maxTurns !== undefined && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateOptions({ maxTurns: undefined })}
                className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Thinking Tokens</Label>
          <div className="relative">
            <Input
              type="number"
              min="1024"
              max="100000"
              step="1024"
              placeholder="Auto"
              value={options.maxThinkingTokens ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                updateOptions({ maxThinkingTokens: value === '' ? undefined : parseInt(value) });
              }}
              className="h-8 text-xs pr-8"
            />
            {options.maxThinkingTokens !== undefined && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => updateOptions({ maxThinkingTokens: undefined })}
                className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Skills (Global)</Label>
          <Popover open={skillsOpen} onOpenChange={setSkillsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-full text-xs justify-between font-normal">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3 w-3" />
                  <span>{enabledSkillCount > 0 ? `${enabledSkillCount} enabled` : 'None'}</span>
                </div>
                {enabledSkillCount > 0 && (
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setEnabledSkills({});
                      try {
                        const settings = await ccGetSettings<any>();
                        settings.enabledSkills = {};
                        await ccUpdateSettings(settings);
                      } catch (error) {
                        console.error('Failed to clear skills:', error);
                      }
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-56 p-2">
              <div className="space-y-2">
                {installedSkills.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-2">
                    No skills installed
                  </div>
                ) : (
                  installedSkills.map((skill) => (
                    <div key={skill} className="flex items-center space-x-2">
                      <Checkbox
                        id={`skill-${skill}`}
                        checked={enabledSkills[skill] ?? false}
                        onCheckedChange={() => toggleSkill(skill)}
                      />
                      <label
                        htmlFor={`skill-${skill}`}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {skill}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">MCP Servers</Label>
          <Popover open={mcpOpen} onOpenChange={setMcpOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-full text-xs justify-between font-normal">
                <div className="flex items-center gap-1.5">
                  <Server className="h-3 w-3" />
                  <span>
                    {options.mcpServers && Object.keys(options.mcpServers).length > 0
                      ? `${Object.keys(options.mcpServers).length} configured`
                      : 'None'}
                  </span>
                </div>
                {options.mcpServers && Object.keys(options.mcpServers).length > 0 && (
                  <X
                    className="h-3 w-3 ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOptions({ mcpServers: undefined });
                    }}
                  />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" side="top" className="w-96 p-3 max-h-96 overflow-y-auto">
              <CCMCPManager
                servers={options.mcpServers || {}}
                onChange={(servers) => {
                  updateOptions({
                    mcpServers: Object.keys(servers).length > 0 ? servers : undefined,
                  });
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </Card>
  );
}
