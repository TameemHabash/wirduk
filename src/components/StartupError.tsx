import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

import { UI_FONTS } from '@/theme/fonts';

import { AppText } from './AppText';
import { Button } from './Button';
import { IconTile } from './IconTile';
import { Screen } from './Screen';

/** Shown when the databases cannot be opened at start (very rare). Centered (redesign). */
export function StartupError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.center}>
        <IconTile icon="info" tone="gold" size={56} />
        <AppText accessibilityRole="header" style={styles.title}>
          {t('startupError.title')}
        </AppText>
        <AppText tone="muted" style={styles.text}>
          {t('startupError.body')}
        </AppText>
        <AppText tone="faint" variant="caption" style={styles.text}>
          {error.message}
        </AppText>
        <Button title={t('common.retry')} size="small" onPress={onRetry} style={styles.button} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontFamily: UI_FONTS.semibold, fontSize: 19, lineHeight: 28, textAlign: 'center' },
  text: { textAlign: 'center', alignSelf: 'stretch' },
  button: { alignSelf: 'center' },
});
