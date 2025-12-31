import { useCCStore, ModelType, PermissionMode } from "@/stores/ccStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CCFooter() {
  const { model, permissionMode, setModel, setPermissionMode } = useCCStore();

  const handleModelChange = (value: string) => {
    setModel(value as ModelType);
  };

  const handlePermissionModeChange = (value: string) => {
    setPermissionMode(value as PermissionMode);
  };

  return (
    <div className="shrink-0 flex gap-2 p-2 border-t bg-background">
      <Select value={model} onValueChange={handleModelChange}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sonnet">Sonnet</SelectItem>
          <SelectItem value="haiku">Haiku</SelectItem>
          <SelectItem value="opus">Opus</SelectItem>
        </SelectContent>
      </Select>

      <Select value={permissionMode} onValueChange={handlePermissionModeChange}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="Permission mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="acceptEdits">Accept Edits</SelectItem>
          <SelectItem value="plan">Plan</SelectItem>
          <SelectItem value="bypassPermissions">Bypass</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
