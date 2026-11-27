import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useSettings } from '@/data/settings/SettingsProvider';
import { counterStore } from '@/features/reader/state/counter-store';
import { haptics } from '@/lib/haptics';
import { NAME_MARK, aroundName } from '@/i18n/around-name';
import { DISPLAY_FONT, UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { BeadCircle } from '@/features/reader/components/BeadCircle';
import { useCategoryAdhkar } from '@/features/reader/hooks/useCategoryAdhkar';

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
  const subtitle = aroundName(t('completion.subtitle', { title: NAME_MARK }));

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
            // The chapter's name bold and teal, no «» (owner, 2026-11-25).
            <AppText tone="muted" style={styles.subtitle}>
              {subtitle[0]}
              <AppText style={[styles.name, { color: colors.primaryInk }]}>{title}</AppText>
              {subtitle[1]}
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
  subtitle: { textAlign: 'center', fontSize: 15, lineHeight: 24 },
  name: { fontFamily: UI_FONTS.semibold, fontSize: 15 },
  blessing: { fontFamily: DISPLAY_FONT, fontSize: 36, lineHeight: 58, textAlign: 'center' },
  actions: { alignSelf: 'stretch', maxWidth: 360, width: '100%', marginHorizontal: 'auto' },
});
