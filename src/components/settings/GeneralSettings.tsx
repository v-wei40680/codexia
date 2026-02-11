import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, type Theme, type Accent } from '@/stores/settings';
import { useSettingsStore, type TaskDetail } from '@/stores/settings';
import { LanguageSelector } from './LanguageSelector';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Introduce } from '../common/Introduce';
import { RateLimitSettings } from './RateLimitSettings';

const ACCENT_OPTIONS: Array<{ value: Accent; label: string; colorClass: string }> = [
  { value: 'black', label: 'Noir', colorClass: 'bg-slate-800' },
  { value: 'pink', label: 'Pink', colorClass: 'bg-pink-500' },
  { value: 'blue', label: 'Blue', colorClass: 'bg-blue-500' },
  { value: 'green', label: 'Green', colorClass: 'bg-emerald-500' },
  { value: 'purple', label: 'Purple', colorClass: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', colorClass: 'bg-orange-500' },
];

export function GeneralSettings() {
  const { theme, setTheme, accent, setAccent } = useThemeStore();
  const handleThemeChange = (value: string) => setTheme(value as Theme);
  const { taskDetail, setTaskDetail } = useSettingsStore();
  const handleTaskDetailChange = (value: string) => setTaskDetail(value as TaskDetail);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <RateLimitSettings />
      <section className="space-y-3">
        <h3 className="text-sm font-medium px-1">Appearance</h3>
        <Card>
          <CardContent className="px-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-muted-foreground">
                  Select your preferred color scheme.
                </div>
              </div>
              <Tabs value={theme} onValueChange={handleThemeChange}>
                <TabsList className="h-8">
                  <TabsTrigger value="light" className="px-3 gap-2 text-xs">
                    <Sun className="h-3.5 w-3.5" />
                    Light
                  </TabsTrigger>
                  <TabsTrigger value="dark" className="px-3 gap-2 text-xs">
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </TabsTrigger>
                  <TabsTrigger value="system" className="px-3 gap-2 text-xs">
                    <Monitor className="h-3.5 w-3.5" />
                    System
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{t('header.accentColor')}</div>
                <div className="text-xs text-muted-foreground">
                  Pick a highlight color for active controls and accents.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ACCENT_OPTIONS.map(({ value, label, colorClass }) => {
                  const selected = accent === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccent(value)}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                        'hover:bg-accent/60 hover:text-accent-foreground',
                        selected
                          ? 'border-primary bg-accent text-accent-foreground'
                          : 'border-border text-foreground'
                      )}
                      aria-pressed={selected}
                      aria-label={`Use ${label} accent color`}
                    >
                      <span className={cn('size-2.5 rounded-full', colorClass)} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="h-px bg-border" />
            <LanguageSelector />
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Task detail</div>
                <div className="text-xs text-muted-foreground">
                  Choose how much command output to show in tasks.
                </div>
              </div>
              <Select defaultValue={taskDetail} onValueChange={handleTaskDetailChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="steps">Steps</SelectItem>
                  <SelectItem value="stepsWithCommand">Steps with code commands</SelectItem>
                  <SelectItem value="stepsWithOutput">Steps with code output</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Introduce />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
