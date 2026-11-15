import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Logo } from '@/components/Logo';
import { useAdwamuhaOptional } from '@/features/adwamuha/AdwamuhaProvider';
import { OWNER_TEXTS } from '@/features/adwamuha/owner-texts';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * Logo + settings (and, while «أدومها» is off, its badge), then the search
 * entry. The logo already shows the app name.
 */
export function HomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.row}>
        {/* Screen readers still hear the app name as the page heading. */}
        <View accessible accessibilityRole="header" accessibilityLabel={t('home.title')}>
          <Logo size={44} />
        </View>
        <View style={[styles.row, { gap: spacing.xs }]}>
          <AdwamuhaBadge />
          <IconButton
            icon="settings"
            label={t('home.openSettings')}
            onPress={() => router.push('/settings')}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('home.searchPlaceholder')}
        onPress={() => router.push('/search')}
        style={[
          styles.search,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            gap: spacing.sm,
          },
        ]}
      >
        <Icon name="search" size={18} color={colors.textFaint} />
        <AppText tone="faint">{t('home.searchPlaceholder')}</AppText>
      </Pressable>
    </View>
  );
}

/**
 * While «أدومها» is off: a small badge next to the settings button that opens its
 * welcome screens (owner, 2026-11-14: for whoever skipped them when the app was
 * installed or updated). Gone once it is on.
 */
function AdwamuhaBadge() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, radii, spacing } = useAppTheme();
  const adwamuha = useAdwamuhaOptional();
  if (!adwamuha?.ready || adwamuha.enabled) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.adwamuhaBadge')}
      onPress={() => router.push('/adwamuha/intro')}
      hitSlop={6}
      style={({ pressed }) => [
        styles.badge,
        {
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceMuted,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      <AppText variant="label" tone="primary">
        {OWNER_TEXTS.featureName}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  badge: { minHeight: 34, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
