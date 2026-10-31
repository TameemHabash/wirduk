import '@/i18n';

import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupError } from '@/components/StartupError';
import { ToastProvider } from '@/components/Toast';
import { DataProvider } from '@/data/DataProvider';
import { SettingsProvider, useSettings } from '@/data/settings/SettingsProvider';
import { AdwamuhaProvider } from '@/features/adwamuha/AdwamuhaProvider';
import { OWNER_TEXTS } from '@/features/adwamuha/owner-texts';
import { AudioProvider } from '@/features/audio/AudioProvider';
import { showRemindersInForeground } from '@/features/reminders/reminders';
import { useReminderSync } from '@/features/reminders/useReminders';
import { syncLayoutDirection } from '@/i18n/direction';
import { UI_FONTS } from '@/theme/fonts';
import type { ThemePreference } from '@/theme/resolve';
import { AppThemeProvider, useAppTheme } from '@/theme/ThemeProvider';

// Keep the splash screen until the databases and settings are ready.
void SplashScreen.preventAutoHideAsync();
showRemindersInForeground();

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

function RootStack() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: UI_FONTS.semibold },
      }}
    >
      {/* Screens with their own header (custom layout). */}
      <Stack.Screen name="index" options={{ title: t('home.title'), headerShown: false }} />
      <Stack.Screen name="search" options={{ title: t('search.title'), headerShown: false }} />
      <Stack.Screen name="category/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="category/[id]/done" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="adwamuha/ward/[session]/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="adwamuha/ward/[session]/done"
        options={{ headerShown: false, animation: 'fade' }}
      />
      {/* Screens with the standard header. */}
      <Stack.Screen name="settings" options={{ title: t('settings.title') }} />
      <Stack.Screen name="about" options={{ title: t('about.title') }} />
      <Stack.Screen name="report" options={{ title: t('report.title') }} />
      <Stack.Screen name="adwamuha/index" options={{ title: OWNER_TEXTS.labels.progressTitle }} />
      <Stack.Screen name="adwamuha/start" options={{ title: t('adwamuha.setup.startTitle') }} />
      <Stack.Screen
        name="adwamuha/order"
        options={{ title: t('adwamuha.settingsScreen.orderTitle') }}
      />
      <Stack.Screen
        name="adwamuha/reminders"
        options={{ title: t('adwamuha.setup.remindersTitle') }}
      />
      <Stack.Screen name="adwamuha/plan" options={{ title: OWNER_TEXTS.labels.editPlan }} />
      <Stack.Screen name="adwamuha/settings" options={{ title: OWNER_TEXTS.featureName }} />
      <Stack.Screen name="adwamuha/intro" options={{ title: OWNER_TEXTS.featureName }} />
      <Stack.Screen name="audio" options={{ title: t('audio.downloads.title') }} />
      <Stack.Screen name="custom/index" options={{ title: t('custom.manageTitle') }} />
      <Stack.Screen name="custom/new" options={{ title: t('custom.newCategoryTitle') }} />
      <Stack.Screen name="custom/[id]/index" options={{ title: t('custom.editCategoryTitle') }} />
      <Stack.Screen name="custom/[id]/dhikr/[dhikrId]" options={{ title: '' }} />
    </Stack>
  );
}

/** Everything that needs the saved settings. */
function ThemedApp() {
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
          <RootStack />
        </ToastProvider>
      </NavigationTheme>
    </AppThemeProvider>
  );
}

export default function RootLayout() {
  const { i18n } = useTranslation();

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
                <ThemedApp />
              </AudioProvider>
            </AdwamuhaProvider>
          </SettingsProvider>
        </DataProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
