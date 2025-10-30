import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProviderListProps {
  providers: string[];
  selectedProvider: string;
  onProviderSelect: (provider: string) => void;
}

export default function ProviderList({ 
  providers, 
  selectedProvider, 
  onProviderSelect 
}: ProviderListProps) {
  return (
    <Card className="col-span-1">
      <CardContent className="p-4 space-y-2">
        {providers.map((p) => (
          <Button
            key={p}
            variant={selectedProvider === p ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => onProviderSelect(p)}
          >
            {p}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}