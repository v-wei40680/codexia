import { useCCStore, ModelType, PermissionMode } from "@/stores/ccStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CCFooter() {
  const { options, updateOptions } = useCCStore();

  return (
    <Card className="shrink-0 border-t p-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Model</Label>
          <div className="relative">
            <Select
              value={options.model ?? "default"}
              onValueChange={(value) => updateOptions({ model: value === "default" ? undefined : value as ModelType })}
            >
              <SelectTrigger className="h-8 text-xs pr-8">
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Auto (Default)</SelectItem>
                <SelectItem value="sonnet">Sonnet 4.5</SelectItem>
                <SelectItem value="opus">Opus 4.5</SelectItem>
                <SelectItem value="haiku">Haiku 4.5</SelectItem>
              </SelectContent>
            </Select>
            {options.model !== undefined && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateOptions({ model: undefined })}
                className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

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
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => updateOptions({ maxThinkingTokens: undefined })}
                className="absolute right-0 top-0 h-8 w-8 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
