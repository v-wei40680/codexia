import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionMode } from '@/stores/ccStore';

interface CCPermissionModeSelectProps {
  value: PermissionMode;
  onChange: (value: PermissionMode) => void;
}

export function CCPermissionModeSelect({ value, onChange }: CCPermissionModeSelectProps) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue as PermissionMode)}>
      <SelectTrigger className="h-7 w-[108px] text-[10px] bg-transparent border-none focus:ring-0 focus:ring-offset-0 pr-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="top">
        <SelectItem value="default" className="text-xs">
          Ask Permission
        </SelectItem>
        <SelectItem value="acceptEdits" className="text-xs">
          Accept Edits
        </SelectItem>
        <SelectItem value="plan" className="text-xs">
          Plan Mode
        </SelectItem>
        <SelectItem value="bypassPermissions" className="text-xs">
          Bypass All
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
