import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { api } from '../lib/api';

export type ThemeMode = 'dark' | 'light';
export type Accent = 'black' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

export interface CustomThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

interface ThemeContextType {
  theme: ThemeMode;
  accent: Accent;
  customColors: CustomThemeColors;
  setTheme: (theme: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setAccent: (accent: Accent) => Promise<void>;
  setCustomColors: (colors: Partial<CustomThemeColors>) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_preference';
const ACCENT_STORAGE_KEY = 'theme_accent';
const CUSTOM_COLORS_STORAGE_KEY = 'theme_custom_colors';

// Default custom theme colors (based on current dark theme)
const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  background: 'oklch(0.12 0.01 240)',
  foreground: 'oklch(0.98 0.01 240)',
  card: 'oklch(0.14 0.01 240)',
  cardForeground: 'oklch(0.98 0.01 240)',
  primary: 'oklch(0.98 0.01 240)',
  primaryForeground: 'oklch(0.12 0.01 240)',
  secondary: 'oklch(0.16 0.01 240)',
  secondaryForeground: 'oklch(0.98 0.01 240)',
  muted: 'oklch(0.16 0.01 240)',
  mutedForeground: 'oklch(0.65 0.01 240)',
  accent: 'oklch(0.16 0.01 240)',
  accentForeground: 'oklch(0.98 0.01 240)',
  destructive: 'oklch(0.6 0.2 25)',
  destructiveForeground: 'oklch(0.98 0.01 240)',
  border: 'oklch(0.16 0.01 240)',
  input: 'oklch(0.16 0.01 240)',
  ring: 'oklch(0.98 0.01 240)',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [accent, setAccentState] = useState<Accent>('pink');
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>(DEFAULT_CUSTOM_COLORS);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference, accent, and custom colors from storage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Load theme preference
        const savedTheme = await api.getSetting(THEME_STORAGE_KEY);

        if (savedTheme) {
          const themeMode = savedTheme as ThemeMode;
          setThemeState(themeMode);
          await applyTheme(themeMode, customColors);
        } else {
          // No saved preference: apply dark as the default theme
          setThemeState('dark');
          await applyTheme('dark', customColors);
        }

        // Load accent preference
        const savedAccent = await api.getSetting(ACCENT_STORAGE_KEY);
        if (savedAccent) {
          const accentColor = savedAccent as Accent;
          setAccentState(accentColor);
          applyAccent(accentColor);
        }

        // Load custom colors
        const savedColors = await api.getSetting(CUSTOM_COLORS_STORAGE_KEY);

        if (savedColors) {
          const colors = JSON.parse(savedColors) as CustomThemeColors;
          setCustomColorsState(colors);
        }
      } catch (error) {
        console.error('Failed to load theme settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply theme to document
  const applyTheme = useCallback(async (themeMode: ThemeMode, colors: CustomThemeColors) => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(themeMode);

    // Clear custom CSS variables
    Object.keys(colors).forEach((key) => {
      const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.removeProperty(cssVarName);
    });
  }, []);

  // Apply accent color to document
  const applyAccent = useCallback((accentColor: Accent) => {
    const root = document.documentElement;

    // Remove any previous accent-* classes
    Array.from(root.classList)
      .filter((c) => c.startsWith('accent-'))
      .forEach((c) => root.classList.remove(c));

    // Add new accent class
    root.classList.add(`accent-${accentColor}`);
  }, []);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    try {
      setIsLoading(true);

      // Apply theme immediately
      setThemeState(newTheme);
      await applyTheme(newTheme, customColors);

      // Save to storage
      await api.saveSetting(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customColors, applyTheme]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    await setTheme(newTheme);
  }, [theme, setTheme]);

  const setAccent = useCallback(async (newAccent: Accent) => {
    try {
      setIsLoading(true);

      // Apply accent immediately
      setAccentState(newAccent);
      applyAccent(newAccent);

      // Save to storage
      await api.saveSetting(ACCENT_STORAGE_KEY, newAccent);
    } catch (error) {
      console.error('Failed to save accent preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyAccent]);

  const setCustomColors = useCallback(async (colors: Partial<CustomThemeColors>) => {
    try {
      setIsLoading(true);

      const newColors = { ...customColors, ...colors };
      setCustomColorsState(newColors);

      // Save to storage
      await api.saveSetting(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(newColors));
    } catch (error) {
      console.error('Failed to save custom colors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [customColors]);

  const value: ThemeContextType = {
    theme,
    accent,
    customColors,
    setTheme,
    toggleTheme,
    setAccent,
    setCustomColors,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
