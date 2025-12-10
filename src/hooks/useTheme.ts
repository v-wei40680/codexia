import { useThemeContext } from '../contexts/ThemeContext';

/**
 * Hook to access and control the theme system
 *
 * @returns {Object} Theme utilities and state
 * @returns {ThemeMode} theme - Current theme mode ('dark' | 'light')
 * @returns {Accent} accent - Current accent color
 * @returns {Function} setTheme - Function to change the theme mode
 * @returns {Function} toggleTheme - Function to toggle between dark and light mode
 * @returns {Function} setAccent - Function to change the accent color
 * @returns {boolean} isLoading - Whether theme operations are in progress
 *
 * @example
 * const { theme, setTheme, toggleTheme, accent, setAccent } = useTheme();
 *
 * // Change theme
 * await setTheme('light');
 *
 * // Toggle between dark and light
 * await toggleTheme();
 *
 * // Change accent color
 * await setAccent('blue');
 */
export const useTheme = () => {
  return useThemeContext();
};