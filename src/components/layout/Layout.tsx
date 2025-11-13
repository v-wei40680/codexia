import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { RouteTracker } from "../common/RouteTracker";
import { Toaster } from 'sonner';

export function Layout() {
  return (
    <main className="h-screen flex flex-col">
      <RouteTracker />
      {/* App Header */}
      <div className="flex-shrink-0">
        <AppHeader />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>

      <Toaster />
    </main>
  );
}
