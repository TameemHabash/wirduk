import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useAdwamuha } from '@/features/adwamuha/AdwamuhaProvider';
import { TodayWardCard } from '@/features/adwamuha/TodayWardCard';
import { BackupNote } from '@/features/backup/BackupNote';
import { useNotificationTaps } from '@/features/reminders/useReminders';
import { useSessionRestore } from '@/features/session/useSessionRestore';
import { useAppTheme } from '@/theme/ThemeProvider';

import { FavoritesStrip } from './FavoritesStrip';
import { HomeHeader } from './HomeHeader';
import { dayPeriod } from './time-of-day';
import { TimeOfDayCards } from './TimeOfDayCards';
import { useHomeCategories } from './useHomeCategories';

/** Re-checks morning/evening when the app comes back to the foreground. */
function useDayPeriod() {
  const [period, setPeriod] = useState(() => dayPeriod(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setPeriod(dayPeriod(new Date()));
    });
    return () => sub.remove();
  }, []);
  return period;
}

/**
 * «الرئيسية», the first tab (redesign): what to read now. The golden card of the morning or
 * evening (or «وردك اليوم» while «أدومها» is on, then the quiet morning and evening cards),
 * then the favorites. Every chapter is in the «الأذكار» tab.
 */
export function HomeScreen() {
  const { t } = useTranslation();
  // In this order: a tap on a reminder wins over "continue where I stopped".
  useNotificationTaps();
  useSessionRestore();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();
  const period = useDayPeriod();
  const adwamuhaOn = useAdwamuha().enabled;
  const { categories, favorites, error, reload } = useHomeCategories();

  // Favorites and own categories change on other screens: refresh when Home is shown again.
  useFocusEffect(reload);

  const open = useCallback(
    (id: number) => router.push({ pathname: '/category/[id]', params: { id: String(id) } }),
    [router],
  );

  if (error) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: colors.background }]}>
        <AppText tone="muted">{t('home.loadError')}</AppText>
        <Pressable accessibilityRole="button" onPress={reload} style={{ padding: spacing.md }}>
          <AppText tone="primary">{t('common.retry')}</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <HomeHeader />
        {/* «أدومها» on: «وردك اليوم» takes the golden card's place. */}
        <TodayWardCard />
        {!adwamuhaOn && categories && (
          <TimeOfDayCards period={period} categories={categories} onOpen={open} />
        )}
        {/* Nothing saved the user's data for 30 days: a gentle note (milestone 12). */}
        <BackupNote />
        {adwamuhaOn && categories && (
          <TimeOfDayCards period={period} categories={categories} onOpen={open} quiet />
        )}
        {categories && <FavoritesStrip favorites={favorites} onOpen={open} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
