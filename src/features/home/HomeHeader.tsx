import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Logo } from '@/components/Logo';
import { useAppTheme } from '@/theme/ThemeProvider';

/** Logo + settings, then the search entry. The logo already shows the app name. */
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
        <IconButton
          icon="settings"
          label={t('home.openSettings')}
          onPress={() => router.push('/settings')}
        />
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: { height: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
