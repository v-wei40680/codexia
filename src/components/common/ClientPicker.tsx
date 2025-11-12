import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { invoke } from "@/lib/tauri-proxy";
import { useTranslation } from "react-i18next";
import { useCodexStore } from "@/stores/useCodexStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ClientName = "codex" | "coder";

export function ClientPicker() {
  const { t } = useTranslation();
  const { clientName, setClientName } = useCodexStore();
  const [clientVersion, setClientVersion] = useState<string>("");

  const fetchClientVersion = useCallback(async (name: ClientName) => {
    try {
      const version =
        name === "codex"
          ? await invoke<string>("check_codex_version")
          : await invoke<string>("check_coder_version");
      setClientVersion(version);
    } catch {
      setClientVersion("");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const name = await invoke<string>("get_client_name");
        if (name === "codex" || name === "coder") {
          setClientName(name as ClientName);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    fetchClientVersion(clientName);
  }, [clientName, fetchClientVersion]);

  const onChangeClient = useCallback(
    async (value: string) => {
      const next: ClientName = value === "coder" ? "coder" : "codex";
      try {
        await invoke("set_client_name", { name: next });
        setClientName(next);
        await fetchClientVersion(next);
      } catch (e) {
        console.error("Failed to set client_name:", e);
      }
    },
    [setClientName, fetchClientVersion],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:bg-accent transition-colors">
          {/* Status indicator with animation */}
          <div className="relative">
            <span
              className={`block w-3 h-3 rounded-full ${clientVersion ? "bg-green-500" : "bg-destructive"}`}
              aria-hidden="true"
            />
            {clientVersion && (
              <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
            )}
          </div>

          {/* Client info with better hierarchy */}
          <div className="flex flex-col items-start min-w-[60px]">
            <span className="text-xs text-muted-foreground">
              {clientVersion || t("header.codexUnavailable")}
            </span>
          </div>

          <ChevronDown className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={clientName}
          onValueChange={onChangeClient}
        >
          <DropdownMenuRadioItem value="codex">Codex</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="coder">Coder</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
