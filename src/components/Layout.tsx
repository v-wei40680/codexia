import { Outlet } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { RouteTracker } from "@/components/RouteTracker";

export function Layout() {
  return (
    <main className="h-screen flex flex-col">
      <RouteTracker />
      {/* App Header */}
      <div className="flex-shrink-0">
        <AppHeader />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

    </main>
  );
}