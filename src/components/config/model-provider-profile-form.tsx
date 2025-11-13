import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useProviderStore } from "@/stores";
import { ConfigTip } from "./config-tip";
import { ConfigService } from "@/services/configService";

export function AddProviderForm() {
  const [name, setName] = useState("");
  const [models, setModels] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addProvider, providers } = useProviderStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const parsedModels = models
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);

    if (!trimmedName || parsedModels.length === 0) {
      toast.error("Provider name and at least one model are required.");
      return;
    }

    if (providers.some((p) => p.name === trimmedName)) {
      toast.error("Provider with this name already exists.");
      return;
    }

    const providerId = trimmedName.toLowerCase().replace(/\s+/g, "-");

    setIsSubmitting(true);
    try {
      await ConfigService.addProviderWithProfile({
        providerId,
        providerName: trimmedName,
        baseUrl: baseUrl || undefined,
        envKey: envKey || undefined,
        model: parsedModels[0],
      });

      addProvider(
        {
          name: trimmedName,
          models: parsedModels,
          baseUrl: baseUrl || undefined,
          envKey: envKey || undefined,
        },
        { persist: false },
      );

      toast.success("Provider added successfully!");
      setName("");
      setModels("");
      setBaseUrl("");
      setEnvKey("");
    } catch (error) {
      console.error("Failed to add provider:", error);
      toast.error("Failed to add provider. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="space-y-2">
          <Label>Provider Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Custom AI"
          />
        </div>
        <div className="space-y-2">
          <Label>Models (comma-separated)</Label>
          <Input
            value={models}
            onChange={(e) => setModels(e.target.value)}
            placeholder="model-1, model-2"
          />
        </div>
        <div className="space-y-2">
          <Label>Base URL (Optional)</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="e.g., https://api.example.com/v1"
          />
        </div>
        <div className="space-y-2">
          <Label>Environment Key (Optional)</Label>
          <Input
            value={envKey}
            onChange={(e) => setEnvKey(e.target.value)}
            placeholder="e.g., MY_API_KEY"
          />
        </div>
        <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Provider"}
        </Button>
      </form>
      <div className="text-center">
        <ConfigTip />
      </div>
    </div>
  );
}

export function AddModelForm({
  providerId,
  onAdd,
}: {
  providerId: string;
  onAdd: () => void;
}) {
  const [modelName, setModelName] = useState("");
  const { addModel } = useProviderStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;
    addModel(providerId, modelName.trim());
    setModelName("");
    onAdd();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Model Name</Label>
        <Input
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="e.g., new-model-v1"
        />
      </div>
      <Button type="submit" size="sm" className="w-full">
        Add Model
      </Button>
    </form>
  );
}
