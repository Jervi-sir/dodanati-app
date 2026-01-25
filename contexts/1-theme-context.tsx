import React, { createContext, useCallback, useContext, useEffect, useState, } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_theme_mode';

export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  colors: {
    background: string;
    card: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentSoft: string;
    danger: string;
    success: string;
  };
};

const lightTheme: AppTheme = {
  mode: 'light',
  colors: {
    background: '#F9FAFB',
    card: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    accent: '#111827',
    accentSoft: '#E5E7EB33',
    danger: '#EF4444',
    success: '#16A34A',
  },
};

const darkTheme: AppTheme = {
  mode: 'dark',
  colors: {
    background: '#020617', // slate-950-ish
    card: '#020617',
    surface: '#020617',
    border: '#1F2937',
    text: '#F9FAFB',
    textMuted: '#9CA3AF',
    accent: '#F9FAFB',
    accentSoft: '#374151',
    danger: '#F97373',
    success: '#22C55E',
  },
};

type ThemeContextValue = {
  theme: AppTheme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userMode, setUserMode] = useState<ThemeMode | null>(null);
  const systemScheme = useColorScheme();
  const [hydrated, setHydrated] = useState(false);

  // hydrate from AsyncStorage once
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setUserMode(stored);
        }
        // if stored is null, we stay null (system default)
      } catch {
        // failed to load, stay null
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setUserMode(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => { });
  }, []);

  const toggleMode = useCallback(() => {
    setUserMode((prev) => {
      const currentSystem = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
      const currentEffective = prev ?? currentSystem;
      const next = currentEffective === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => { });
      return next;
    });
  }, []);

  const mode: ThemeMode = userMode ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  const value: ThemeContextValue = {
    theme,
    mode,
    setMode,
    toggleMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {/* If you want, you can gate rendering until hydrated */}
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
};

