import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { analytics } from "@/lib/analytics";
import { useTrackEvent } from "@/hooks";
import { toast } from "sonner";

export function AnalyticsSettings() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const trackEvent = useTrackEvent();

  useEffect(() => {
    const settings = analytics.getSettings();
    if (settings) {
      setAnalyticsEnabled(settings.enabled);
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await analytics.enable();
        setAnalyticsEnabled(true);
        trackEvent.settingsChanged('analytics_enabled', true);
        toast.success("Analytics enabled");
      } else {
        await analytics.disable();
        setAnalyticsEnabled(false);
        trackEvent.settingsChanged('analytics_enabled', false);
        toast.success("Analytics disabled");
      }
    } catch (error) {
      console.error("Failed to toggle analytics:", error);
      toast.error("Failed to update analytics settings");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Help improve Codexia by sharing anonymous usage data
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1 flex-1">
            <Label htmlFor="analytics-enabled" className="text-base font-medium">
              Enable Analytics
            </Label>
            <p className="text-sm text-muted-foreground">
              Share anonymous usage data to help us improve the product
            </p>
          </div>
          <Switch
            id="analytics-enabled"
            checked={analyticsEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {analyticsEnabled && (
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Your privacy is protected</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• No personal information or file contents collected</li>
                  <li>• All data is anonymous with random IDs</li>
                  <li>• File paths and project names are sanitized</li>
                  <li>• You can disable analytics at any time</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">What we track:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Feature usage (which pages and features you use)</li>
            <li>Error occurrences (to help us fix bugs)</li>
            <li>Performance metrics (to optimize the app)</li>
            <li>MCP server types (stdio/http/sse usage)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
