import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isTauri } from "@/hooks/runtime";

type UpdateButtonProps = {
  hasUpdate: boolean;
  onUpdate: () => void | Promise<void>;
};

export function UpdateButton({ hasUpdate, onUpdate }: UpdateButtonProps) {
  if (!isTauri()) {
    return null;
  }

  if (import.meta.env.DEV) {
    return <Badge variant="destructive">DEV</Badge>;
  }

  if (!hasUpdate) {
    return null;
  }

  return (
    <Button
      size="sm"
      onClick={() => void onUpdate()}
      className="h-6 rounded-md bg-blue-500 px-2 text-xs font-medium text-white hover:bg-blue-600"
    >
      Update
    </Button>
  );
}
