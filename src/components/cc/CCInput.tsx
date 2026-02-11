import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Slash, CircleStop, Send } from 'lucide-react';
import { CCFooter } from '@/components/cc/CCFooter';
import { FolderSelectorCompact } from '@/components/features/dxt/FolderSelectorCompact';
import { invoke } from '@tauri-apps/api/core';
import { useCCStore, ModelType } from '@/stores/ccStore';

interface CCInputProps {
  input: string;
  setInput: (value: string | ((prev: string) => string)) => void;
  onSendMessage: (text?: string) => void;
  onInterrupt: () => void;
}

export function CCInput({ input, setInput, onSendMessage, onInterrupt }: CCInputProps) {
  const { showFooter, setShowFooter, isLoading, setShowExamples, options, updateOptions } =
    useCCStore();
  const [showCommands, setShowCommands] = useState(false);
  const [installedSkills, setInstalledSkills] = useState<string[]>([]);

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const skills = await invoke<string[]>('cc_get_installed_skills');
        setInstalledSkills(skills);
      } catch (error) {
        console.error('Failed to load installed skills:', error);
      }
    };
    loadSkills();
  }, []);

  const handleInsertCommand = (skillName: string) => {
    setInput(`/${skillName} `);
    setShowCommands(false);
  };

  return (
    <>
      <div className="shrink-0 flex flex-col gap-2 p-2 border-t bg-background">
        <div className="relative group">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading) {
                  onSendMessage();
                }
              }
            }}
            onFocus={() => setShowExamples(false)}
            placeholder="Ask Claude to do anything..."
            className="min-h-16 w-full pb-11 pr-2 resize-none"
            disabled={isLoading}
          />

          <div className="absolute left-1 bottom-1 flex items-center gap-0.5">
            <Button
              onClick={() => setShowFooter(!showFooter)}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Toggle Options"
            >
              <Settings className={`h-4 w-4 ${showFooter ? 'text-primary' : ''}`} />
            </Button>
            <Popover open={showCommands} onOpenChange={setShowCommands}>
              <PopoverTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Insert Slash Command"
                >
                  <Slash className={`h-4 w-4 ${showCommands ? 'text-primary' : ''}`} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-56 p-2">
                <div className="space-y-1">
                  {installedSkills.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      No skills installed
                    </div>
                  ) : (
                    installedSkills.map((skill) => (
                      <Button
                        key={skill}
                        variant="ghost"
                        className="w-full justify-start text-xs h-7 font-mono"
                        onClick={() => handleInsertCommand(skill)}
                      >
                        /{skill}
                      </Button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <FolderSelectorCompact />
          </div>

          <div className="absolute right-1 bottom-1 flex items-center gap-1.5 px-1 bg-background/50 backdrop-blur-sm rounded-md">
            <Select
              value={options.model ?? 'default'}
              onValueChange={(value) =>
                updateOptions({ model: value === 'default' ? undefined : (value as ModelType) })
              }
            >
              <SelectTrigger className="h-7 w-[100px] text-[10px] bg-transparent border-none focus:ring-0 focus:ring-offset-0 pr-0">
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="default" className="text-xs">
                  Auto (Default)
                </SelectItem>
                <SelectItem value="sonnet" className="text-xs">
                  Sonnet 4.5
                </SelectItem>
                <SelectItem value="opus" className="text-xs">
                  Opus 4.5
                </SelectItem>
                <SelectItem value="haiku" className="text-xs">
                  Haiku 4.5
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={isLoading ? onInterrupt : () => onSendMessage()}
              size="icon"
              className="h-7 w-7"
              variant={isLoading ? 'destructive' : 'default'}
              disabled={!input.trim() && !isLoading}
            >
              {isLoading ? (
                <CircleStop className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Fixed footer - Options */}
        {showFooter && <CCFooter />}
      </div>
    </>
  );
}
