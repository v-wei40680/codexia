import { Outlet } from "react-router-dom";
import { DebugPanel } from "@/components/DebugPanel";
import { AppHeader } from "@/components/AppHeader";

export function Layout() {
  return (
    <main className="h-screen flex flex-col">
      {/* App Header */}
      <div className="flex-shrink-0">
        <AppHeader />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* Debug Panel */}
      <DebugPanel />
    </main>
  );
}