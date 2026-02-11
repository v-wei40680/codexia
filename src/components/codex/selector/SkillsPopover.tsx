import { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { codexService } from '@/services/codexService';
import type { SkillsListEntry } from '@/bindings/v2/SkillsListEntry';
import { Switch } from '@/components/ui/switch';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';

export function SkillsPopover() {
  const { cwd } = useWorkspaceStore();
  const [skillsList, setSkillsList] = useState<SkillsListEntry[]>([]);

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) {
          codexService.listSkills(cwd).then(setSkillsList).catch(console.error);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <DollarSign className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-w-[600px] max-h-96 overflow-y-auto">
        <div className="space-y-4">
          <h4 className="font-medium leading-none mb-2 text-sm text-muted-foreground">
            Available Skills
          </h4>
          {skillsList.flatMap((entry) => entry.skills).length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">No skills found.</div>
          ) : (
            <div className="grid gap-2">
              {skillsList
                .flatMap((entry) => entry.skills)
                .map((skill, i) => (
                  <div
                    key={`${skill.name}-${i}`}
                    className="flex justify-between gap-2 border-b pb-2 last:border-0 last:pb-0"
                  >
                    <span className="flex gap-2">
                      <div className="font-medium text-sm">{skill.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {skill.shortDescription || skill.description}
                      </div>
                    </span>
                    <span className="flex gap-2">
                      <div className="text-xs text-muted-foreground">{skill.scope}</div>
                      <Switch
                        checked={skill.enabled}
                        onCheckedChange={(checked) => {
                          codexService.skillsConfigWrite(skill.path, checked).catch(console.error);
                          setSkillsList((prev) => {
                            return prev.map((entry) => {
                              if (entry.skills.some((s) => s.path === skill.path)) {
                                return {
                                  ...entry,
                                  skills: entry.skills.map((s) => {
                                    if (s.path === skill.path) {
                                      return {
                                        ...s,
                                        enabled: checked,
                                      };
                                    }
                                    return s;
                                  }),
                                };
                              }
                              return entry;
                            });
                          });
                        }}
                      />
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
