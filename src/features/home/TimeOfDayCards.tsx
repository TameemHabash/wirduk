import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { APP_CONFIG } from '@/config/app-config';
import type { Category } from '@/data/models';
import { useAppTheme } from '@/theme/ThemeProvider';

import { timeOfDayCategoryIds, type DayPeriod } from './time-of-day';

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

/** Morning and evening cards; the one for the current time comes first, marked "الآن". */
export function TimeOfDayCards({ period, categories, onOpen, quiet = false }: Props) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  if (quiet) return <QuietCards categories={categories} onOpen={onOpen} />;
  const ids = timeOfDayCategoryIds(period);

  return (
    <View style={[styles.row, { gap: spacing.sm }]}>
      {ids.map((id, i) => {
        const category = categories.find((c) => c.id === id);
        if (!category) return null;
        const isNow = i === 0;
        const isMorning = id === APP_CONFIG.content.morningCategoryId;
        const badge = isNow
          ? t('home.now')
          : t(isMorning ? 'home.morningBadge' : 'home.eveningBadge');
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={t(isNow ? 'home.categoryLabelNow' : 'home.categoryLabel', {
              title: category.title,
              countText: t('home.adhkarCount', { count: category.adhkarCount }),
            })}
            onPress={() => onOpen(id)}
            style={({ pressed }) => [
              styles.card,
              {
                borderRadius: radii.lg,
                padding: spacing.md,
                backgroundColor: isNow ? colors.primary : colors.surface,
                borderColor: isNow ? colors.primary : colors.border,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={styles.top}>
              <Icon
                name={isMorning ? 'sun' : 'moon'}
                color={isNow ? colors.onPrimary : colors.accent}
              />
              <View
                style={[
                  styles.badge,
                  {
                    borderRadius: radii.pill,
                    backgroundColor: isNow ? 'rgba(255,255,255,0.18)' : colors.accentSoft,
                  },
                ]}
              >
                <AppText
                  variant="label"
                  style={{ color: isNow ? colors.onPrimary : colors.accent }}
                >
                  {badge}
                </AppText>
              </View>
            </View>
            <AppText
              variant="bodyStrong"
              tone={isNow ? 'onPrimary' : 'default'}
              style={{ marginTop: spacing.md }}
            >
              {category.title}
            </AppText>
            <AppText
              variant="caption"
              tone={isNow ? 'onPrimary' : 'muted'}
              style={isNow && styles.soft}
            >
              {t('home.adhkarCount', { count: category.adhkarCount })}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuietCards({ categories, onOpen }: Omit<Props, 'period' | 'quiet'>) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const ids = [APP_CONFIG.content.morningCategoryId, APP_CONFIG.content.eveningCategoryId];
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="heading" accessibilityRole="header">
        {t('adwamuha.home.fullAdhkar')}
      </AppText>
      <View style={[styles.row, { gap: spacing.sm }]}>
        {ids.map((id) => {
          const category = categories.find((c) => c.id === id);
          if (!category) return null;
          const isMorning = id === APP_CONFIG.content.morningCategoryId;
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
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radii.lg,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Icon
                name={isMorning ? 'sun' : 'moon'}
                color={isMorning ? colors.accent : colors.primary}
              />
              <View style={styles.fill}>
                <AppText variant="bodyStrong">{category.title}</AppText>
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
  row: { flexDirection: 'row' },
  fill: { flex: 1 },
  quiet: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  card: { flex: 1, minHeight: 116, borderWidth: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 2 },
  soft: { opacity: 0.85 },
});
