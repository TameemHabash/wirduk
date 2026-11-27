import { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { useSettings } from '@/data/settings/SettingsProvider';
import { useAdwamuhaEnabled } from '@/features/adwamuha/state/AdwamuhaProvider';
import { AdwamuhaSettings } from '@/features/adwamuha/components/AdwamuhaSettings';
import { toMegabytes } from '@/features/audio/logic/audio-plan';
import { useAudioStatus } from '@/features/audio/hooks/useAudioStatus';
import { BackupSettings } from '@/features/backup/components/BackupSettings';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { ReadingSettings } from '@/features/settings/components/ReadingSettings';
import { ReminderSettings } from '@/features/settings/components/ReminderSettings';
import { LinkRow, RowDivider, SettingsGroup, ToggleRow } from '@/components/ui/SettingsRows';
import { ThemePicker } from '@/features/settings/components/ThemePicker';

/** Settings. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, update } = useSettings();
  const { session } = useRepositories();
  const { colors, spacing } = useAppTheme();
  const audio = useAudioStatus();
  const adwamuhaOn = useAdwamuhaEnabled();

  // ?focus=restoreSession (the restore toast's arrow): scroll to that row and light it for a
  // few seconds (owner, 2026-11-26).
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const scroll = useRef<ScrollView>(null);
  const readingY = useRef(0);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    if (focus !== 'restoreSession') return;
    router.setParams({ focus: '' });
    const show = setTimeout(() => {
      scroll.current?.scrollTo({ y: Math.max(0, readingY.current - 12), animated: true });
      setLit(true);
    }, 250);
    const hide = setTimeout(() => setLit(false), 250 + FOCUS_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [focus, router]);

  return (
    // A tab (redesign): its own large title, no header.
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.xl }}
      >
        <AppText accessibilityRole="header" style={styles.largeTitle}>
          {t('settings.title')}
        </AppText>
        {/* «أدومها» first and highlighted (owner); with it on, the reminders move into it. */}
        <AdwamuhaSettings />

        <ReadingSettings />

        <View onLayout={(e) => (readingY.current = e.nativeEvent.layout.y)}>
          <SettingsGroup title={t('settings.whileReading')}>
            <ToggleRow
              icon="screen"
              label={t('settings.keepScreenOn')}
              value={settings.keepScreenOn}
              onChange={(v) => void update('keepScreenOn', v)}
            />
            <RowDivider />
            <ToggleRow
              icon="history"
              label={t('settings.restoreSession')}
              hint={t('settings.restoreSessionHint')}
              value={settings.restoreSession}
              highlight={lit}
              onChange={(v) => {
                void update('restoreSession', v);
                // Off: forget a state saved earlier, so it is never restored.
                if (!v) void session.clear().catch(() => undefined);
              }}
            />
          </SettingsGroup>
        </View>

        {adwamuhaOn ? null : <ReminderSettings />}

        <SettingsGroup title={t('settings.theme.title')} boxless>
          <ThemePicker />
        </SettingsGroup>

        <SettingsGroup title={t('settings.feedback')}>
          <ToggleRow
            icon="vibrate"
            label={t('settings.haptics')}
            value={settings.hapticsEnabled}
            onChange={(v) => void update('hapticsEnabled', v)}
          />
          <RowDivider />
          <ToggleRow
            icon="vibrate"
            label={t('settings.nextDhikrVibration')}
            value={settings.nextDhikrVibration}
            onChange={(v) => void update('nextDhikrVibration', v)}
          />
          <RowDivider />
          <ToggleRow
            icon="vibrate"
            label={t('settings.completionVibration')}
            value={settings.completionVibration}
            onChange={(v) => void update('completionVibration', v)}
          />
          <RowDivider />
          <ToggleRow
            icon="sound"
            label={t('settings.tickSound')}
            value={settings.tickSound}
            onChange={(v) => void update('tickSound', v)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.audio')}>
          <LinkRow
            icon="download"
            label={t('settings.downloadAudio')}
            value={
              !audio
                ? undefined
                : audio.missing.length === 0
                  ? t('settings.audioAllDone')
                  : t('audio.mb', { n: toMegabytes(audio.missingBytes) })
            }
            onPress={() => router.push('/audio')}
          />
          <RowDivider />
          <ToggleRow
            icon="head"
            label={t('settings.backgroundPlayback')}
            value={settings.backgroundPlayback}
            onChange={(v) => void update('backgroundPlayback', v)}
          />
          <RowDivider />
          <ToggleRow
            icon="play"
            label={t('settings.autoplayNext')}
            value={settings.autoplayNext}
            onChange={(v) => void update('autoplayNext', v)}
          />
          <RowDivider />
          <ToggleRow
            icon="beads"
            label={t('settings.audioCounts')}
            hint={t('settings.audioCountsHint')}
            value={settings.audioCounts}
            onChange={(v) => void update('audioCounts', v)}
          />
        </SettingsGroup>

        {/* The user's own data, safe in a file and in Android's backup (milestone 12). */}
        <BackupSettings />

        <SettingsGroup title={t('settings.support')}>
          <LinkRow
            icon="info"
            iconTone="plain"
            label={t('about.title')}
            onPress={() => router.push('/about')}
          />
          <RowDivider />
          <LinkRow
            icon="lock"
            iconTone="plain"
            external
            label={t('settings.privacy')}
            onPress={() => void Linking.openURL(APP_CONFIG.privacyPolicyUrl)}
          />
          {/* Only once the relay is deployed (APP_CONFIG.report.endpoint). */}
          {APP_CONFIG.report.endpoint ? (
            <>
              <RowDivider />
              <LinkRow
                icon="flag"
                iconTone="plain"
                label={t('report.title')}
                onPress={() => router.push('/report')}
              />
            </>
          ) : null}
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

/** How long the row stays lit. */
export const FOCUS_MS = 3000;

const styles = StyleSheet.create({
  largeTitle: { fontFamily: UI_FONTS.semibold, fontSize: 28, lineHeight: 40, paddingTop: 8 },
});
