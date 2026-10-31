import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AppState, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ReorderableList, {
  reorderItems,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { APP_CONFIG } from '@/config/app-config';
import type { HomeCategory } from '@/data/models';
import { useAdwamuha } from '@/features/adwamuha/AdwamuhaProvider';
import { TodayWardCard } from '@/features/adwamuha/TodayWardCard';
import { BackupNote } from '@/features/backup/BackupNote';
import { useNotificationTaps } from '@/features/reminders/useReminders';
import { useSessionRestore } from '@/features/session/useSessionRestore';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import { CategoryRow } from './CategoryRow';
import { FavoritesStrip } from './FavoritesStrip';
import { HomeHeader } from './HomeHeader';
import { MyAdhkarSection } from './MyAdhkarSection';
import { ReorderRow } from './ReorderRow';
import { dayPeriod } from './time-of-day';
import { TimeOfDayCards } from './TimeOfDayCards';
import { useHomeCategories } from './useHomeCategories';

const TIME_OF_DAY_IDS: ReadonlySet<number> = new Set([
  APP_CONFIG.content.morningCategoryId,
  APP_CONFIG.content.eveningCategoryId,
]);

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

export function HomeScreen() {
  const { t } = useTranslation();
  // In this order: a tap on a reminder wins over "continue where I stopped".
  useNotificationTaps();
  useSessionRestore();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();
  const period = useDayPeriod();
  const adwamuhaOn = useAdwamuha().enabled;
  // The list runs under the system navigation bar: end it above the bar.
  const bottomInset = useSafeAreaInsets().bottom;
  const {
    categories,
    customCategories,
    favorites,
    error,
    reload,
    toggleFavorite,
    saveOrder,
    resetOrder,
  } = useHomeCategories();

  // Own categories are edited on other screens: refresh when Home is shown again.
  useFocusEffect(reload);
  const [editing, setEditing] = useState(false);

  // Morning and evening are cards at the top; the list holds the rest.
  const listItems = useMemo(
    () => (categories ?? []).filter((c) => !TIME_OF_DAY_IDS.has(c.id)),
    [categories],
  );
  const [editItems, setEditItems] = useState<HomeCategory[]>([]);

  const open = useCallback(
    (id: number) => router.push({ pathname: '/category/[id]', params: { id: String(id) } }),
    [router],
  );
  const onToggleFavorite = useCallback((id: number) => void toggleFavorite(id), [toggleFavorite]);

  const startEditing = () => {
    setEditItems(listItems);
    setEditing(true);
  };

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => {
    const next = reorderItems(editItems, from, to);
    setEditItems(next);
    void saveOrder(next.map((c) => c.id));
  };

  const confirmRestore = () => {
    Alert.alert(t('home.restoreConfirmTitle'), t('home.restoreConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('home.restore'),
        style: 'destructive',
        onPress: () => {
          void resetOrder();
          setEditing(false);
        },
      },
    ]);
  };

  const sectionHeader = (
    <View style={[styles.sectionHeader, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
      <AppText
        // Remount when the text changes: Android otherwise reuses the old width and cuts the text.
        key={editing ? 'edit' : 'all'}
        variant="heading"
        accessibilityRole="header"
        style={styles.sectionTitle}
      >
        {editing ? t('home.editOrder') : t('home.allAdhkar')}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={editing ? () => setEditing(false) : startEditing}
        style={styles.textButton}
      >
        <AppText variant="label" tone="primary">
          {editing ? t('common.done') : t('home.editOrder')}
        </AppText>
      </Pressable>
    </View>
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
      {editing ? (
        <View style={styles.fill}>
          {/*
            Fixed bar above the list (not a list header): "تم" stays visible while
            scrolling, and taps here never pass through the list's drag gesture,
            which delayed them.
          */}
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.sm,
              gap: spacing.sm,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            {sectionHeader}
            <AppText variant="caption" tone="muted">
              {t('home.editHint')}
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={confirmRestore}
              style={{ paddingVertical: spacing.sm, alignSelf: 'flex-start' }}
            >
              <AppText variant="label" tone="primary">
                {t('home.restoreDefault')}
              </AppText>
            </Pressable>
          </View>
          <ReorderableList
            data={editItems}
            onReorder={onReorder}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item }) => <ReorderRow category={item} />}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: spacing.xxxl + bottomInset,
            }}
            style={styles.fill}
          />
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item, index }) => {
            // Rows together look like one rounded card.
            const first = index === 0;
            const last = index === listItems.length - 1;
            return (
              <View
                style={[
                  styles.cardSide,
                  { borderColor: colors.border },
                  first && {
                    borderTopWidth: 1,
                    borderTopStartRadius: radii.lg,
                    borderTopEndRadius: radii.lg,
                  },
                  !first && { borderTopWidth: StyleSheet.hairlineWidth },
                  last && {
                    borderBottomWidth: 1,
                    borderBottomStartRadius: radii.lg,
                    borderBottomEndRadius: radii.lg,
                  },
                ]}
              >
                <CategoryRow category={item} onOpen={open} onToggleFavorite={onToggleFavorite} />
              </View>
            );
          }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl + bottomInset }}
          ListHeaderComponent={
            <View style={{ gap: spacing.lg }}>
              <HomeHeader />
              {/* Adwamuha (when on): «وردك اليوم» on top, the full adhkar quiet below it. */}
              <TodayWardCard />
              {/* Nothing saved the user's data for 30 days: a gentle note (milestone 12). */}
              <BackupNote />
              {categories && (
                <TimeOfDayCards
                  period={period}
                  categories={categories}
                  onOpen={open}
                  quiet={adwamuhaOn}
                />
              )}
              <FavoritesStrip favorites={favorites} onOpen={open} />
              {categories && (
                <MyAdhkarSection
                  categories={customCategories}
                  onOpen={open}
                  onToggleFavorite={onToggleFavorite}
                />
              )}
              {sectionHeader}
            </View>
          }
          style={styles.fill}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Takes all free space, so its width never depends on a cached text measure.
  sectionTitle: { flex: 1 },
  textButton: { minHeight: TOUCH_TARGET, justifyContent: 'center', paddingHorizontal: 8 },
  cardSide: { borderStartWidth: 1, borderEndWidth: 1, overflow: 'hidden' },
});
