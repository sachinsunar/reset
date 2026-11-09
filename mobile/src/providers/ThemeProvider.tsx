import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/store/useAppStore';
import { darkTheme, lightTheme, type Theme } from '@/theme';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useAppStore((state) => state.profile?.themeMode ?? 'system');
  const systemScheme = useColorScheme();
  const dark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const theme = dark ? darkTheme : lightTheme;
  const value = useMemo(() => theme, [theme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
