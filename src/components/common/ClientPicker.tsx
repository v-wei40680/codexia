import { useCallback, useMemo, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  const codexStatusText = useMemo(
    () => (clientVersion ? clientVersion : t("header.codexUnavailable")),
    [clientVersion, t],
  );

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
    <>
      <span
        className={`w-2 h-2 rounded-full ${clientVersion ? "bg-green-500" : "bg-destructive"}`}
        aria-hidden="true"
      ></span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className="flex items-center gap-1">
            <Badge
              aria-label={`${t("header.statusBadgeLabel")}: ${codexStatusText}`}
              title={t("header.codexVersion")}
            >
              {codexStatusText}
            </Badge>
            <ChevronDown />
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={clientName}
            onValueChange={onChangeClient}
          >
            <DropdownMenuRadioItem value="codex">Codex</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="coder">Coder</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
