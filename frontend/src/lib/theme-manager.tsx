import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useBaseTheme } from '../context/BaseThemeContext'; // Import useBaseTheme

export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { baseTheme } = useBaseTheme(); // Get base theme from our new context
  const { resolvedTheme } = useTheme(); // Still need resolvedTheme for useEffect dependency

  useEffect(() => {
    // Set the data-theme attribute on the html element
    document.documentElement.setAttribute('data-theme', baseTheme);

  }, [baseTheme, resolvedTheme]); // Re-run when baseTheme or resolvedTheme changes

  return <>{children}</>;
};
