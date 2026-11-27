import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { GoldCard } from '@/components/ui/GoldCard';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { APP_CONFIG } from '@/config/app-config';
import type { Category } from '@/data/models/index';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { timeOfDayCategoryIds, type DayPeriod } from '@/features/home/logic/time-of-day';

interface Props {
  period: DayPeriod;
  categories: readonly Category[];
  onOpen: (categoryId: number) => void;
  /**
   * «أدومها» is on (design): small, quiet cards under «الصباح والمساء» (owner,
   * 2026-10-30), morning first, no "الآن", so only «وردك اليوم» stands out.
   */
  quiet?: boolean;
}

/**
 * The current period as one big golden card (sun or moon, «الآن», «ابدأ»), the other
 * period as a small row under it (redesign; the time rule is the same as before).
 */
export function TimeOfDayCards({ period, categories, onOpen, quiet = false }: Props) {
  const { t } = useTranslation();
  const { spacing } = useAppTheme();
  if (quiet) return <QuietCards categories={categories} onOpen={onOpen} />;
  const [nowId, otherId] = timeOfDayCategoryIds(period);
  const now = categories.find((c) => c.id === nowId);
  const other = categories.find((c) => c.id === otherId);
  const countText = (c: Category) => t('home.adhkarCount', { count: c.adhkarCount });

  return (
    <View style={{ gap: spacing.md }}>
      {now ? <HeroCard category={now} onOpen={onOpen} countText={countText(now)} /> : null}
      {other ? <MiniRow category={other} onOpen={onOpen} countText={countText(other)} /> : null}
    </View>
  );
}

const isMorning = (id: number) => id === APP_CONFIG.content.morningCategoryId;

function HeroCard({
  category,
  onOpen,
  countText,
}: {
  category: Category;
  onOpen: (id: number) => void;
  countText: string;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const morning = isMorning(category.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.categoryLabelNow', { title: category.title, countText })}
      onPress={() => onOpen(category.id)}
      style={({ pressed }) => pressed && { opacity: 0.92 }}
    >
      <GoldCard period={morning ? 'morning' : 'evening'} sky>
        <View style={styles.row}>
          <View style={[styles.heroTile, { backgroundColor: colors.heroBox }]}>
            <Icon
              name={morning ? 'sun' : 'moon'}
              size={24}
              color={morning ? colors.sun : colors.accentInk}
            />
          </View>
          <View style={styles.fill} />
          <View style={[styles.now, { backgroundColor: colors.primary }]}>
            <AppText style={[styles.nowText, { color: colors.onPrimary }]}>{t('home.now')}</AppText>
          </View>
        </View>
        <View>
          <AppText style={styles.title}>{category.title}</AppText>
          <AppText tone="muted" style={styles.count}>
            {countText}
          </AppText>
        </View>
        <View style={[styles.go, { backgroundColor: colors.primary }]}>
          <AppText roomy style={[styles.goText, { color: colors.onPrimary }]}>
            {t('home.start')}
          </AppText>
          <Icon name="forward" size={18} color={colors.onPrimary} />
        </View>
      </GoldCard>
    </Pressable>
  );
}

function MiniRow({
  category,
  onOpen,
  countText,
}: {
  category: Category;
  onOpen: (id: number) => void;
  countText: string;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.categoryLabel', { title: category.title, countText })}
      onPress={() => onOpen(category.id)}
      style={({ pressed }) => [
        styles.mini,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <IconTile icon={isMorning(category.id) ? 'sun' : 'moon'} />
      <View style={styles.fill}>
        <AppText variant="bodyStrong">{category.title}</AppText>
        <AppText variant="caption" tone="muted">
          {countText}
        </AppText>
      </View>
      <Icon name="forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

function QuietCards({ categories, onOpen }: Omit<Props, 'period' | 'quiet'>) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const ids = [APP_CONFIG.content.morningCategoryId, APP_CONFIG.content.eveningCategoryId];
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText style={styles.section} accessibilityRole="header">
        {t('adwamuha.home.fullAdhkar')}
      </AppText>
      <View style={[styles.row, { gap: 10 }]}>
        {ids.map((id) => {
          const category = categories.find((c) => c.id === id);
          if (!category) return null;
          const morning = isMorning(id);
          const countText = t('home.adhkarCount', { count: category.adhkarCount });
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={t('home.categoryLabel', { title: category.title, countText })}
              onPress={() => onOpen(id)}
              style={({ pressed }) => [
                styles.quiet,
                {
                  backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Icon
                name={morning ? 'sun' : 'moon'}
                color={morning ? colors.accent : colors.primaryInk}
              />
              <View style={styles.fill}>
                <AppText style={styles.quietTitle}>{category.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {countText}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  heroTile: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  now: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  nowText: { fontFamily: UI_FONTS.semibold, fontSize: 12, lineHeight: 17 },
  title: { fontFamily: UI_FONTS.semibold, fontSize: 24, lineHeight: 34 },
  count: { fontSize: 14, lineHeight: 22 },
  go: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
  },
  goText: { fontFamily: UI_FONTS.semibold, fontSize: 15, lineHeight: 22 },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  section: { fontFamily: UI_FONTS.semibold, fontSize: 17, lineHeight: 26 },
  quiet: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  quietTitle: { fontFamily: UI_FONTS.medium, fontSize: 14, lineHeight: 22 },
});
