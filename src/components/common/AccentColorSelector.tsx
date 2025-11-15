import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore, type Accent } from "@/stores/settings/ThemeStore";
import { Palette } from "lucide-react";
import { Button } from "../ui/button";

const ACCENT_OPTIONS: Array<{
  value: Accent;
  label: string;
  colorClass: string;
}> = [
  { value: "black", label: "Noir", colorClass: "bg-slate-800" },
  { value: "pink", label: "Pink", colorClass: "bg-pink-500" },
  { value: "blue", label: "Blue", colorClass: "bg-blue-500" },
  { value: "green", label: "Green", colorClass: "bg-emerald-500" },
  { value: "purple", label: "Purple", colorClass: "bg-purple-500" },
  { value: "orange", label: "Orange", colorClass: "bg-orange-500" },
];

export function AccentColorSelector() {
  const { accent, setAccent } = useThemeStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-6 w-6">
          <Palette />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={accent}
          onValueChange={(val) => setAccent(val as Accent)}
        >
          {ACCENT_OPTIONS.map(({ value, label, colorClass }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <span className="inline-flex items-center gap-2">
                <span className={`inline-block size-3 rounded-full ${colorClass}`} />{" "}
                {label}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
