import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * The setup: what it is, where to start, the ward order (owner, 2026-10-30),
 * the reminders.
 */
const SETUP_SCREENS = 4;

/** The layout of a setup screen: the content, then the page dots and the buttons at the bottom. */
export function SetupLayout({
  page,
  children,
  actions,
}: {
  /** From 0: which of the setup screens. */
  page: number;
  children: ReactNode;
  actions: ReactNode;
}) {
  const { colors, spacing } = useAppTheme();
  return (
    <SafeAreaView edges={['bottom']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.grow, { padding: spacing.lg, gap: spacing.lg }]}>
        {children}
        <View style={styles.fill} />
        <SetupDots page={page} />
        <View style={{ gap: spacing.sm }}>{actions}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** One dot per setup screen (design), the current one long. */
function SetupDots({ page }: { page: number }) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={t('adwamuha.setupHelp.page', { page: page + 1, total: SETUP_SCREENS })}
      style={[styles.row, styles.centered, { gap: spacing.sm }]}
    >
      {Array.from({ length: SETUP_SCREENS }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === page
              ? { width: 22, backgroundColor: colors.primary }
              : { backgroundColor: colors.border },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * A choice with a radio mark (design: «ابدأ من أول خطوة» / «أحافظ على بعضها»),
 * its note smaller than its title, and an optional badge after the title
 * (design: «ننصح به»).
 */
export function ChoiceCard({
  title,
  note,
  badge,
  selected,
  onPress,
}: {
  title: string;
  note: string;
  badge?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, radii, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[title, badge, note].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radii.lg,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.fill, { gap: spacing.xs }]}>
        {badge ? (
          <View style={[styles.row, { gap: spacing.sm }]}>
            {/* A little more room than Android measures, so a Galaxy S21+ does not wrap
                (and hide) the last word (wirduk-reports#2); the badge stays near the title. */}
            <AppText variant="bodyStrong" style={styles.titleWithBadge}>
              {title}
            </AppText>
            <View
              style={[
                styles.badge,
                { borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
              ]}
            >
              <AppText variant="label" tone="primary" style={styles.badgeText}>
                {badge}
              </AppText>
            </View>
            <View style={styles.afterBadge} />
          </View>
        ) : (
          <AppText variant="bodyStrong">{title}</AppText>
        )}
        <AppText variant="caption" tone="muted">
          {note}
        </AppText>
      </View>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.textFaint }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  centered: { justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  // The free space after the title: a tenth to the title, the rest after the badge.
  titleWithBadge: { flexGrow: 1, flexShrink: 1 },
  afterBadge: { flexGrow: 9 },
  badge: { paddingHorizontal: 8, paddingVertical: 1 },
  badgeText: { minWidth: 48, textAlign: 'center' },
});
