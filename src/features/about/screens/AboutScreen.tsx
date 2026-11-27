import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { APP_CONFIG } from '@/config/app-config';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

const TANZIL_URL = 'https://tanzil.net';

/** App information only (brief §13). */
export function AboutScreen() {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();

  const box = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  };

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={[styles.center, { gap: spacing.sm, paddingVertical: spacing.lg }]}>
          <Logo size={96} />
          <AppText variant="title">{t('appName')}</AppText>
          <AppText tone="muted" style={styles.tagline}>
            {t('about.tagline')}
          </AppText>
          <AppText variant="caption" tone="faint">
            {t('about.version', {
              version: Constants.expoConfig?.version ?? '',
              content: APP_CONFIG.content.version,
            })}
          </AppText>
        </View>

        {/* The promise in a band under the logo (redesign). */}
        <View style={[styles.band, { backgroundColor: colors.primarySoft }]}>
          <AppText style={[styles.promise, { color: colors.primaryInk }]}>
            {t('about.promise')}
          </AppText>
        </View>

        <View style={box}>
          <AppText variant="heading">{t('about.contentTitle')}</AppText>
          <AppText tone="muted">{t('about.content')}</AppText>
          <AppText tone="muted">{t('about.sources')}</AppText>
          {/* Tanzil's terms: name the project and link to tanzil.net. */}
          <AppText tone="muted">{t('about.quran')}</AppText>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(TANZIL_URL)}
            hitSlop={8}
            style={styles.link}
          >
            <AppText style={[styles.linkText, { color: colors.primaryInk }]}>
              {t('about.quranLink')}
            </AppText>
            <Icon name="external" size={15} color={colors.primaryInk} />
          </Pressable>
          <AppText tone="muted">{t('about.audio')}</AppText>
        </View>

        <View style={box}>
          <AppText variant="heading">{t('about.fontsTitle')}</AppText>
          <AppText tone="muted">{t('about.fonts')}</AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  tagline: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  band: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  promise: { fontFamily: UI_FONTS.medium, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    minHeight: 32,
  },
  linkText: { fontFamily: UI_FONTS.medium, fontSize: 13, lineHeight: 20 },
});
