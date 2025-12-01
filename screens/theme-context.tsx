// src/theme/theme.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Appearance, ColorSchemeName, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export const lightTheme: AppTheme = {
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

export const darkTheme: AppTheme = {
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
  const [mode, setModeState] = useState<ThemeMode>('light');

  const [hydrated, setHydrated] = useState(false);

  const applySystemDefault = () => {
    const colorScheme: ColorSchemeName = Appearance.getColorScheme();
    if (colorScheme === 'dark') return 'dark';
    return 'light';
  };

  // hydrate from AsyncStorage once
  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
        } else {
          setModeState(applySystemDefault());
        }
      } catch {
        setModeState(applySystemDefault());
      } finally {
        setHydrated(true);
      }
    };
    load();
  }, []);

  // persist when mode changes
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => { });
  }, [mode, hydrated]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

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

/* ----------------- Small global switcher ----------------- */

export const ThemeSwitcherButton: React.FC<{
  compact?: boolean;
}> = ({ compact }) => {
  const { mode, toggleMode, theme } = useTheme();

  if (compact) {
    // icon-only variant (for top-right, etc.)
    return (
      <TouchableOpacity
        onPress={toggleMode}
        activeOpacity={0.8}
        style={[
          styles.iconButton,
          { backgroundColor: mode === 'dark' ? '#020617' : '#111827' },
        ]}
      >
        <Text style={styles.iconButtonText}>
          {mode === 'dark' ? '☀️' : '🌙'}
        </Text>
      </TouchableOpacity>
    );
  }

  // pill version (for settings / params sheet)
  return (
    <TouchableOpacity
      onPress={toggleMode}
      activeOpacity={0.8}
      style={[
        styles.switcher,
        { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.border },
      ]}
    >
      <View
        style={[
          styles.switcherThumb,
          mode === 'dark' ? styles.switcherThumbRight : styles.switcherThumbLeft,
          { backgroundColor: theme.colors.accent },
        ]}
      />
      <View style={styles.switcherLabels}>
        <Text
          style={[
            styles.switcherLabel,
            {
              color: mode === 'light' ? theme.colors.text : theme.colors.textMuted,
              fontWeight: mode === 'light' ? '600' as const : '400' as const,
            },
          ]}
        >
          Clair
        </Text>
        <Text
          style={[
            styles.switcherLabel,
            {
              color: mode === 'dark' ? theme.colors.text : theme.colors.textMuted,
              fontWeight: mode === 'dark' ? '600' as const : '400' as const,
            },
          ]}
        >
          Sombre
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  switcher: {
    width: 120,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  switcherThumb: {
    position: 'absolute',
    width: 56,
    height: 26,
    borderRadius: 999,
    top: 3,
  },
  switcherThumbLeft: {
    left: 4,
  },
  switcherThumbRight: {
    right: 4,
  },
  switcherLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  switcherLabel: {
    fontSize: 12,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  iconButtonText: {
    fontSize: 18,
    color: '#F9FAFB',
  },
});
