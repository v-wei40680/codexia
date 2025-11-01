import { useEffect } from "react";
import { useLayoutStore } from "./stores/settings/layoutStore";
import "./App.css";

export default function App() {
  const { lastRoute } = useLayoutStore();

  useEffect(() => {
    if (lastRoute && lastRoute !== "/") {
      window.location.hash = lastRoute;
    }
  }, []);

  return null;
}