import { useEffect } from 'react';
import { Pressable } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Screen } from './Screen';

/** Shown when the databases cannot be opened at start (very rare). */
export function StartupError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <AppText variant="heading">{t('startupError.title')}</AppText>
      <AppText tone="muted">{t('startupError.body')}</AppText>
      <AppText tone="faint" variant="caption">
        {error.message}
      </AppText>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        style={{
          backgroundColor: colors.primary,
          borderRadius: radii.md,
          padding: spacing.md,
          alignItems: 'center',
        }}
      >
        <AppText tone="onPrimary" variant="bodyStrong">
          {t('common.retry')}
        </AppText>
      </Pressable>
    </Screen>
  );
}
