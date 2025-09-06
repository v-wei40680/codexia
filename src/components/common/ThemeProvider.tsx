import { useEffect } from 'react';
import { useThemeStore } from '@/stores/ThemeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useThemeStore((state) => state.theme);
  const accent = useThemeStore((state) => state.accent);

  useEffect(() => {
    const root = document.documentElement;
    
    // Reset mode and accent classes
    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    // Apply accent class like: accent-pink, accent-blue, etc.
    // Remove any previous accent-* classes before applying the new one.
    Array.from(root.classList)
      .filter((c) => c.startsWith('accent-'))
      .forEach((c) => root.classList.remove(c));
    root.classList.add(`accent-${accent}`);
  }, [theme, accent]);

  return <>{children}</>;
}
