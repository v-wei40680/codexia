import { create } from 'zustand';

// Light/dark mode
export type Theme = 'light' | 'dark' | 'system';

// Accent color theme
export type Accent = 'black' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

interface ThemeState {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAccent: (accent: Accent) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: 'system',
  accent: 'purple',
  setTheme: (theme: Theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => {
      if (state.theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return { theme: isDark ? 'light' : 'dark' };
      }
      return { theme: state.theme === 'dark' ? 'light' : 'dark' };
    }),
  setAccent: (accent: Accent) => set({ accent }),
}));
