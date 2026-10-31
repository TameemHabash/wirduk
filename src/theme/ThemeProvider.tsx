import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SystemUI from 'expo-system-ui';

import { COLORS, type ColorScheme, type ColorTokens } from './colors';
import { resolveColorScheme, type ThemePreference } from './resolve';
import { RADII, SPACING } from './tokens';

export interface AppTheme {
  scheme: ColorScheme;
  colors: ColorTokens;
  spacing: typeof SPACING;
  radii: typeof RADII;
}

interface ThemeContextValue {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface Props {
  children: ReactNode;
  /** Saved user choice. Persistence is wired in the data-layer milestone. */
  initialPreference?: ThemePreference;
  onPreferenceChange?: (preference: ThemePreference) => void;
}

export function AppThemeProvider({
  children,
  initialPreference = 'system',
  onPreferenceChange,
}: Props) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const scheme = resolveColorScheme(preference, systemScheme);

  useEffect(() => {
    // Native parts (keyboard, dialogs) follow the chosen theme too.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  useEffect(() => {
    // Root view color, so no white flash shows behind screens in dark mode.
    void SystemUI.setBackgroundColorAsync(COLORS[scheme].background);
  }, [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: { scheme, colors: COLORS[scheme], spacing: SPACING, radii: RADII },
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        onPreferenceChange?.(next);
      },
    }),
    [scheme, preference, onPreferenceChange],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside <AppThemeProvider>');
  return ctx;
}

export function useAppTheme(): AppTheme {
  return useThemeContext().theme;
}

export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}
