import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore, type Accent } from "@/stores/ThemeStore";
import { Palette } from "lucide-react";
import { Button } from "../ui/button";

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
          <DropdownMenuRadioItem value="pink">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-pink-500" />{" "}
              Pink
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="blue">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-blue-500" />{" "}
              Blue
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="green">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-emerald-500" />{" "}
              Green
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="purple">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-purple-500" />{" "}
              Purple
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="orange">
            <span className="inline-flex items-center gap-2">
              <span className="inline-block size-3 rounded-full bg-orange-500" />{" "}
              Orange
            </span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
