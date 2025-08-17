import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLayoutStore } from "@/stores/layoutStore";

export function RouteTracker() {
  const location = useLocation();
  const { setLastRoute } = useLayoutStore();

  useEffect(() => {
    setLastRoute(location.pathname);
  }, [location.pathname, setLastRoute]);

  return null;
}