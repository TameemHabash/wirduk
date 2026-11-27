import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Logo } from '@/components/ui/Logo';
import { useAdwamuhaOptional } from '@/features/adwamuha/state/AdwamuhaProvider';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * The logo (it already shows the app name), «أدومها»'s gold badge while it is off, and
 * the search button (it opens the adhkar tab with the keyboard up). Settings is a tab.
 */
export function HomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useAppTheme();

  return (
    <View style={[styles.row, { gap: spacing.sm + 2 }]}>
      {/* Screen readers still hear the app name as the page heading. */}
      <View accessible accessibilityRole="header" accessibilityLabel={t('home.title')}>
        <Logo size={44} />
      </View>
      <View style={styles.fill} />
      <AdwamuhaBadge />
      <IconButton
        icon="search"
        label={t('home.searchPlaceholder')}
        color={colors.text}
        onPress={() => router.navigate({ pathname: '/adhkar', params: { focus: 'search' } })}
      />
    </View>
  );
}

/**
 * While «أدومها» is off: «ابنِ وردك خطوةً خطوة ›» (owner, 2026-11-26), which opens its
 * setup (owner, 2026-11-14: for whoever skipped it when the app was installed or updated).
 * Gone once it is on.
 */
function AdwamuhaBadge() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const adwamuha = useAdwamuhaOptional();
  if (!adwamuha?.ready || adwamuha.enabled) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('adwamuha.setup.title')}
      onPress={() => router.push('/adwamuha/intro')}
      hitSlop={6}
      style={({ pressed }) => [
        styles.badge,
        {
          backgroundColor: colors.accentSoft,
          borderColor: colors.accentLine,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Icon name="sprout" size={15} color={colors.accent} />
      <AppText roomy style={[styles.badgeText, { color: colors.accentInk }]}>
        {t('adwamuha.setup.title')}
      </AppText>
      <Icon name="forward" size={15} color={colors.accentInk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingTop: 6 },
  fill: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 1,
  },
  badgeText: { fontFamily: UI_FONTS.semibold, fontSize: 13, lineHeight: 20, flexShrink: 1 },
});
