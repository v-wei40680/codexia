import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useSettingsStore } from '@/stores/settings';

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{title}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel}
      />
    </div>
  );
}

export function UISettings() {
  const {
    showSidebarMarketplace,
    setShowSidebarMarketplace,
    showHeaderTerminalButton,
    setShowHeaderTerminalButton,
    showHeaderWebPreviewButton,
    setShowHeaderWebPreviewButton,
    showHeaderNotesButton,
    setShowHeaderNotesButton,
    showHeaderFilesButton,
    setShowHeaderFilesButton,
    showHeaderDiffButton,
    setShowHeaderDiffButton,
    showHeaderRightPanelToggle,
    setShowHeaderRightPanelToggle,
  } = useSettingsStore();

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium px-1">UI</h3>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sidebar
          </div>
          <SettingRow
            title="Marketplace"
            description="Show or hide the marketplace entry in the sidebar."
            checked={showSidebarMarketplace}
            onCheckedChange={setShowSidebarMarketplace}
            ariaLabel="Toggle sidebar marketplace visibility"
          />

          <Separator />

          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Main Header
          </div>
          <SettingRow
            title="Terminal button"
            description="Show or hide the terminal button in the main header."
            checked={showHeaderTerminalButton}
            onCheckedChange={setShowHeaderTerminalButton}
            ariaLabel="Toggle header terminal button visibility"
          />
          <SettingRow
            title="Web preview button"
            description="Show or hide the web preview button in the main header."
            checked={showHeaderWebPreviewButton}
            onCheckedChange={setShowHeaderWebPreviewButton}
            ariaLabel="Toggle header web preview button visibility"
          />
          <SettingRow
            title="Notes button"
            description="Show or hide the notes button in the main header."
            checked={showHeaderNotesButton}
            onCheckedChange={setShowHeaderNotesButton}
            ariaLabel="Toggle header notes button visibility"
          />
          <SettingRow
            title="Files button"
            description="Show or hide the files button in the main header."
            checked={showHeaderFilesButton}
            onCheckedChange={setShowHeaderFilesButton}
            ariaLabel="Toggle header files button visibility"
          />
          <SettingRow
            title="Diff button"
            description="Show or hide the diff button in the main header."
            checked={showHeaderDiffButton}
            onCheckedChange={setShowHeaderDiffButton}
            ariaLabel="Toggle header diff button visibility"
          />
          <SettingRow
            title="Right panel button"
            description="Show or hide the right panel toggle button in the main header."
            checked={showHeaderRightPanelToggle}
            onCheckedChange={setShowHeaderRightPanelToggle}
            ariaLabel="Toggle header right panel button visibility"
          />
        </CardContent>
      </Card>
    </section>
  );
}
