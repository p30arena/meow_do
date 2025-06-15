import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type ThemeName = 'default' | 'amber-minimal' | 'amethyst-haze' | 'bold-tech' | 'bubble-gum' | 'caffeine' | 'nature' | 'twitter' | 'vercel' | 'mono';

interface BaseThemeContextType {
  baseTheme: ThemeName;
  setBaseTheme: (theme: ThemeName) => void;
}

const BaseThemeContext = createContext<BaseThemeContextType | undefined>(undefined);

export const useBaseTheme = () => {
  const context = useContext(BaseThemeContext);
  if (!context) {
    throw new Error('useBaseTheme must be used within a BaseThemeProvider');
  }
  return context;
};

export const BaseThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state with value from localStorage or 'default'
  const [baseTheme, setBaseThemeState] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('base-theme');
      return (storedTheme as ThemeName) || 'default';
    }
    return 'default';
  });

  // Update localStorage whenever baseTheme changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('base-theme', baseTheme);
    }
  }, [baseTheme]);

  // Wrapper function to update state and localStorage
  const setBaseTheme = (theme: ThemeName) => {
    setBaseThemeState(theme);
  };

  return (
    <BaseThemeContext.Provider value={{ baseTheme, setBaseTheme }}>
      {children}
    </BaseThemeContext.Provider>
  );
};
