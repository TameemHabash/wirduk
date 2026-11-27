import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupError } from '@/components/layout/StartupError';
import { DialogProvider } from '@/components/ui/Dialog';
import { ToastProvider } from '@/components/ui/Toast';
import { DataProvider } from '@/data/DataProvider';
import { SettingsProvider, useSettings } from '@/data/settings/SettingsProvider';
import { AdwamuhaProvider } from '@/features/adwamuha/state/AdwamuhaProvider';
import { AudioProvider } from '@/features/audio/state/AudioProvider';
import { newAppStart } from '@/features/reader/hooks/useSessionRestore';
import { useReminderSync } from '@/features/reminders/hooks/useReminders';
import { syncLayoutDirection } from '@/i18n/direction';
import type { ThemePreference } from '@/theme/resolve';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';

/**
 * Every app-wide provider, in the order they need each other:
 * the databases → the settings → «أدومها» → audio → the theme → the navigator's theme →
 * toasts → dialogs. Screens can use any of them.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  // A new root is a new app start, even in a process Android kept. Before any screen
  // renders, so Home's "continue where I stopped" and reminder taps see it.
  useState(newAppStart);

  useEffect(() => {
    syncLayoutDirection(i18n.language);
  }, [i18n.language]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DataProvider
          renderError={(error, retry) => (
            <AppThemeProvider>
              <StartupError error={error} onRetry={retry} />
            </AppThemeProvider>
          )}
        >
          <SettingsProvider>
            <AdwamuhaProvider>
              <AudioProvider>
                <ThemedProviders>{children}</ThemedProviders>
              </AudioProvider>
            </AdwamuhaProvider>
          </SettingsProvider>
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Everything that needs the saved settings. Hides the splash screen once they are read. */
function ThemedProviders({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const saveTheme = useCallback(
    (preference: ThemePreference) => void update('theme', preference),
    [update],
  );
  useReminderSync();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <AppThemeProvider initialPreference={settings.theme} onPreferenceChange={saveTheme}>
      <NavigationTheme>
        <ToastProvider>
          <DialogProvider>{children}</DialogProvider>
        </ToastProvider>
      </NavigationTheme>
    </AppThemeProvider>
  );
}

/** Gives the navigator (headers, screen backgrounds) our theme colors. */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { scheme, colors } = useAppTheme();
  const navTheme = useMemo<Theme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  );
}
