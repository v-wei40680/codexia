import { AlertTriangle, Bot, MessageCircle, Shield } from 'lucide-react';
import { useState } from 'react';
import type { SandboxMode } from '@/bindings/v2';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useConfigStore } from '@/stores/codex';
import { cn } from '@/lib/utils';

const ACCESS_MODE_OPTIONS: Array<{
  label: string;
  sandbox: SandboxMode;
  icon: typeof MessageCircle;
}> = [
  { label: 'chat', sandbox: 'read-only', icon: MessageCircle },
  { label: 'agent', sandbox: 'workspace-write', icon: Bot },
  { label: 'danger', sandbox: 'danger-full-access', icon: AlertTriangle },
];

export function AccessModePopover() {
  const [open, setOpen] = useState(false);
  const { sandbox, setAccessMode } = useConfigStore();
  const selected =
    ACCESS_MODE_OPTIONS.find((item) => item.sandbox === sandbox) ?? ACCESS_MODE_OPTIONS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
          <Shield className="h-4 w-4" />
          <span className="text-xs">{selected.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-1" align="start">
        <div className="space-y-1">
          {ACCESS_MODE_OPTIONS.map((item) => {
            const Icon = item.icon;
            const isActive = item.sandbox === sandbox;

            return (
              <button
                key={item.sandbox}
                type="button"
                onClick={() => {
                  setAccessMode(item.sandbox);
                  setOpen(false);
                }}
                className={cn(
                  'w-full rounded-md px-2 py-1.5 text-left transition-colors',
                  'grid grid-cols-2 items-center gap-3 text-xs',
                  isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">{item.sandbox}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
