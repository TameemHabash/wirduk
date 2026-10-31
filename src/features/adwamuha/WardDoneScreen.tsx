import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useSettings } from '@/data/settings/SettingsProvider';
import { haptics } from '@/features/feedback/haptics';
import { BeadCircle } from '@/features/reader/BeadCircle';
import { DISPLAY_FONT } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { useAdwamuha } from './AdwamuhaProvider';
import { LibraryMessageView } from './LibraryMessageView';
import type { MessageContent } from './logic/messages';
import type { Session } from './logic/sessions';

/**
 * After a ward: the owner's short prayer or an approved verse / hadith,
 * «العودة للرئيسية», and a gentle word to stop at the ward today (owner: no
 * «read the rest»; a small ward kept every day makes the habit stronger).
 * After both wards of the day: only the owner's prayer (owner, 2026-10-29).
 */
export function WardDoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, spacing } = useAppTheme();
  const params = useLocalSearchParams<{ session: string; counted?: string }>();
  const session: Session = params.session === 'evening' ? 'evening' : 'morning';
  const counted = params.counted === '1';
  const { records, slot, messageFor } = useAdwamuha();
  const buzzed = useRef(false);

  useEffect(() => {
    if (buzzed.current) return;
    buzzed.current = true;
    haptics.categoryComplete(settings.completionVibration);
  }, [settings.completionVibration]);

  const today = slot().date;
  const bothDone =
    counted &&
    (['morning', 'evening'] as const).every((s) =>
      records.some((r) => r.date === today && r.session === s),
    );
  // The same message for the same ward of the same day (owner's words or the library).
  const message: MessageContent | null = !counted
    ? { kind: 'owner', text: t('adwamuha.notCounted') }
    : bothDone
      ? messageFor('bothDone', `both:${today}`)
      : messageFor('wardDone', `ward:${today}:${session}`);

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.grow}>
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.fill, styles.center, { padding: spacing.xl, gap: spacing.lg }]}
        >
          <BeadCircle />
          {message === null ? null : message.kind === 'owner' ? (
            <View style={styles.center} accessible accessibilityRole="header">
              <Text style={[styles.blessing, { color: colors.text }]}>{message.text}</Text>
            </View>
          ) : (
            <View style={styles.message}>
              <LibraryMessageView message={message.message} size={24} />
            </View>
          )}
          {counted && !bothDone ? (
            <AppText tone="muted" style={styles.centerText}>
              {t(`adwamuha.stayWithWard.${session}`)}
            </AppText>
          ) : null}
          <View style={[styles.actions, { gap: spacing.md, marginTop: spacing.md }]}>
            <Button title={t('completion.home')} onPress={() => router.dismissTo('/')} />
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
  blessing: { fontFamily: DISPLAY_FONT, fontSize: 26, lineHeight: 48, textAlign: 'center' },
  actions: { alignSelf: 'stretch', maxWidth: 360, width: '100%', marginHorizontal: 'auto' },
  message: { alignSelf: 'stretch', maxWidth: 560, width: '100%', marginHorizontal: 'auto' },
});
