import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import supabase from "@/lib/supabase";
import { User } from "lucide-react";

export function UserDropdown() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      // Reload page to reset app state
      window.location.reload();
    }
  };

  const handleViewPublicPage = () => {
    if (user?.id) {
      window.open(`/u/${user.id}`, "_blank");
    }
  };

  return (
    <div>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-6 w-6 p-0 rounded-full">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  className="rounded-full w-6 h-6"
                  alt="User avatar"
                />
              ) : (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs">
                  {user.email?.charAt(0)?.toUpperCase() ?? "U"}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewPublicPage}>
              {t("header.viewPublicPage")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              {t("header.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="ghost" className="h-6 w-6 p-0">
          <User />
        </Button>
      )}
    </div>
  );
}
