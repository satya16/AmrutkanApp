import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { loadThemeMode, saveThemeMode, type ThemeMode } from '../storage';

// Fixed dark "chrome" (header + mini-player) — matches the website, which
// keeps these dark regardless of the light/dark toggle.
const CHROME = '#1f1f1f';
const CHROME_TEXT = '#ffffff';
const ACCENT = '#b5541a';

export type ColorPalette = {
  accent: string;
  bg: string;
  surface: string;
  fillTertiary: string;
  fillAlter: string;
  border: string;
  text: string;
  textSecondary: string;
  chrome: string;
  chromeText: string;
};

// Modeled on antd's actual default light/dark algorithm token output, since
// the website's colors come from antd's ConfigProvider, not literal hex
// constants in its source.
const LIGHT: ColorPalette = {
  accent: ACCENT,
  bg: '#f5f5f5',
  surface: '#ffffff',
  fillTertiary: 'rgba(0,0,0,0.04)',
  fillAlter: 'rgba(0,0,0,0.02)',
  border: '#f0f0f0',
  text: 'rgba(0,0,0,0.88)',
  textSecondary: 'rgba(0,0,0,0.65)',
  chrome: CHROME,
  chromeText: CHROME_TEXT,
};

const DARK: ColorPalette = {
  accent: ACCENT,
  bg: '#000000',
  surface: '#141414',
  fillTertiary: 'rgba(255,255,255,0.08)',
  fillAlter: 'rgba(255,255,255,0.04)',
  border: '#303030',
  text: 'rgba(255,255,255,0.85)',
  textSecondary: 'rgba(255,255,255,0.65)',
  chrome: CHROME,
  chromeText: CHROME_TEXT,
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ColorPalette;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    loadThemeMode().then(saved => {
      if (saved) setMode(saved);
    });
  }, []);

  const toggle = () => {
    setMode(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      saveThemeMode(next);
      return next;
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, colors: mode === 'dark' ? DARK : LIGHT, toggle }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
