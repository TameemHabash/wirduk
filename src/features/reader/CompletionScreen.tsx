import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useSettings } from '@/data/settings/SettingsProvider';
import { counterStore } from '@/features/counter/counter-store';
import { haptics } from '@/features/feedback/haptics';
import { DISPLAY_FONT } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { BeadCircle } from './BeadCircle';
import { useCategoryAdhkar } from './useCategoryAdhkar';

/** Shown when every dhikr of a category is complete. */
export function CompletionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, spacing } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useCategoryAdhkar(Number(id));
  const buzzed = useRef(false);

  useEffect(() => {
    if (buzzed.current) return;
    buzzed.current = true;
    haptics.categoryComplete(settings.completionVibration);
  }, [settings.completionVibration]);

  const title = state.status === 'ready' ? state.category.title : '';

  // The reader already resets on leaving; doing it here too keeps both buttons
  // right even if a reader of this category is still open below.
  const resetCounters = () => {
    if (state.status === 'ready') counterStore.resetMany(state.adhkar.map((d) => d.id));
  };
  const home = () => {
    resetCounters();
    router.dismissTo('/');
  };
  const again = () => {
    resetCounters();
    router.replace({ pathname: '/category/[id]', params: { id: String(id) } });
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Scrolls in landscape, where the screen is too short for everything. */}
      <ScrollView contentContainerStyle={styles.grow}>
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.fill, styles.center, { padding: spacing.xl, gap: spacing.lg }]}
        >
          <BeadCircle />
          <View style={styles.center} accessible accessibilityRole="header">
            <Text style={[styles.blessing, { color: colors.text }]}>{t('completion.line1')}</Text>
            <Text style={[styles.blessing, { color: colors.text }]}>{t('completion.line2')}</Text>
          </View>
          {title ? (
            <AppText tone="muted" style={styles.centerText}>
              {t('completion.subtitle', { title })}
            </AppText>
          ) : null}
          <View style={[styles.actions, { gap: spacing.md, marginTop: spacing.md }]}>
            <Button title={t('completion.home')} onPress={home} />
            <Button title={t('completion.again')} kind="secondary" onPress={again} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  blessing: { fontFamily: DISPLAY_FONT, fontSize: 32, lineHeight: 60, textAlign: 'center' },
  actions: { alignSelf: 'stretch', maxWidth: 360, width: '100%', marginHorizontal: 'auto' },
});
