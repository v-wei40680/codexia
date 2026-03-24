import { Button } from "@/components/ui/button";
import { isTauri } from "@/hooks/runtime";
import { CodeXml, Download } from "lucide-react";
import { useUpdater } from "@/hooks/useUpdater";

export function UpdateButton() {
  const { hasUpdate, startUpdate } = useUpdater({ enabled: true });

  if (!isTauri()) {
    return null;
  }

  if (import.meta.env.DEV) {
    return <Button size='icon-sm'>
      <CodeXml className="h-4 w-4" />
    </Button>;
  }

  if (!hasUpdate) {
    return null;
  }

  return (
    <Button
      size="icon-sm"
      variant="outline"
      onClick={() => void startUpdate()}
    >
      <Download className="h-4 w-4" />
    </Button>
  );
}
