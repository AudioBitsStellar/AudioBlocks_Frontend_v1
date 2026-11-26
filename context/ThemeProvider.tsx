'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

export const THEME_STORAGE_KEY = 'theme-preference';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem(storageKey) as Theme;
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          return savedTheme;
        }
      } catch {}
    }
    return defaultTheme;
  });

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        setTheme(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    if (theme === 'system') {
      const listener = () => applyTheme();
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
      } else if ((mediaQuery as any).addListener) {
        (mediaQuery as any).addListener(listener);
        return () => (mediaQuery as any).removeListener(listener);
      }
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme);
        const raw = localStorage.getItem('audioblocks_user_preferences');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.colorScheme = newTheme;
          localStorage.setItem('audioblocks_user_preferences', JSON.stringify(parsed));
        }
      } catch {}
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
