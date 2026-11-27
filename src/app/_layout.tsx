import '@/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

import { OWNER_TEXTS } from '@/features/adwamuha/generated/owner-texts';
import { showRemindersInForeground } from '@/features/reminders/services/reminders';
import { AppProviders } from '@/providers/AppProviders';
import { UI_FONTS } from '@/theme/fonts';

// Keep the splash screen until the databases and settings are ready.
void SplashScreen.preventAutoHideAsync();
showRemindersInForeground();

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

/** Every screen of the app: the three tabs, and the screens pushed above them. */
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
      {/* The three tabs (Home, the adhkar, Settings); every other screen is above them. */}
      <Stack.Screen name="(tabs)" options={{ title: t('home.title'), headerShown: false }} />
      {/* wirduk://search: opens the adhkar tab with the search box ready. */}
      <Stack.Screen name="search" options={{ headerShown: false, animation: 'none' }} />
      {/* Screens with their own header (custom layout). */}
      <Stack.Screen name="category/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="category/[id]/done" options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="adwamuha/ward/[session]/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="adwamuha/ward/[session]/done"
        options={{ headerShown: false, animation: 'fade' }}
      />
      {/* Their own top bar with «حفظ» (redesign): the reorder screen and the editors. */}
      <Stack.Screen name="reorder" options={{ headerShown: false }} />
      <Stack.Screen name="custom/index" options={{ headerShown: false }} />
      <Stack.Screen name="custom/new" options={{ headerShown: false }} />
      <Stack.Screen name="custom/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen name="custom/[id]/dhikr/[dhikrId]" options={{ headerShown: false }} />
      {/* Screens with the standard header. */}
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
    </Stack>
  );
}
