import React, { ReactNode } from 'react';
import { useThemeStore, type Accent } from '@/stores/settings/ThemeStore';

interface ThemeContextType {
  theme: 'light' | 'dark';
  accent: Accent;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccent: (accent: Accent) => void;
}

export type { Accent };

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, accent, toggleTheme, setTheme, setAccent } = useThemeStore();

  const value: ThemeContextType = {
    theme,
    accent,
    toggleTheme,
    setTheme,
    setAccent,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextType {
  const context = React.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}
