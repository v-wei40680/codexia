import { Layers, Zap, SlidersHorizontal, LayoutDashboard } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function WelcomeSection() {
  // Four feature cards based on README.md
  const features = [
    {
      title: "Multi-Session",
      description: "Run multiple sessions with persistent restoration.",
      icon: Layers,
    },
    {
      title: "Streaming",
      description: "Live responses as they generate for instant feedback.",
      icon: Zap,
    },
    {
      title: "Configuration",
      description: "Providers, models, sandbox modes, approvals, and more.",
      icon: SlidersHorizontal,
    },
    {
      title: "Polished UX",
      description: "Notepad, Markdown, Plan/Todo, Themes, WebPreview.",
      icon: LayoutDashboard,
    },
  ] as const;

  return (
    <div className="text-center flex flex-col space-y-6 max-w-3xl px-4 w-full">
      <h2 className="text-2xl font-semibold">Welcome to Codexia</h2>
      <p className="text-sm text-muted-foreground">
        Powerful GUI/IDE for Codex CLI — start by sending your first message.
      </p>

      <div className="grid grid-cols-2 gap-4 text-left">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <Card
              key={i}
              className="hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="rounded-lg p-2 bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
