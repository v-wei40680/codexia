import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type UpdateButtonProps = {
  isDev: boolean;
  hasUpdate: boolean;
  onUpdate: () => void | Promise<void>;
};

export function UpdateButton({ isDev, hasUpdate, onUpdate }: UpdateButtonProps) {
  if (isDev) {
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
