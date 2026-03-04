import { useCCStore, PermissionMode } from '@/stores/ccStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function CCFooter() {
  const { options, updateOptions } = useCCStore();

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
      </div>
    </Card>
  );
}
