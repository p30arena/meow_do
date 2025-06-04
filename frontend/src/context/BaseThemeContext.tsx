import React, { createContext, useContext, useState, type ReactNode } from 'react';

type ThemeName = 'default' | 'amber-minimal' | 'amethyst-haze' | 'bold-tech' | 'bubble-gum' | 'caffeine' | 'nature' | 'twitter' | 'vercel' | 'mono'; // Define ThemeName as a union of string literals

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
  const [baseTheme, setBaseTheme] = useState<ThemeName>('default');

  return (
    <BaseThemeContext.Provider value={{ baseTheme, setBaseTheme }}>
      {children}
    </BaseThemeContext.Provider>
  );
};
