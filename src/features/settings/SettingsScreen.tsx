import { Linking, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_CONFIG } from '@/config/app-config';
import { useRepositories } from '@/data/DataProvider';
import { useSettings } from '@/data/settings/SettingsProvider';
import { useAdwamuha } from '@/features/adwamuha/AdwamuhaProvider';
import { AdwamuhaSettings } from '@/features/adwamuha/AdwamuhaSettings';
import { toMegabytes } from '@/features/audio/audio-plan';
import { useAudioStatus } from '@/features/audio/useAudioStatus';
import { BackupSettings } from '@/features/backup/BackupSettings';
import { useAppTheme } from '@/theme/ThemeProvider';

import { ReadingSettings } from './ReadingSettings';
import { ReminderSettings } from './ReminderSettings';
import { LinkRow, RowDivider, SettingsGroup, ToggleRow } from './SettingsParts';
import { ThemePicker } from './ThemePicker';

/** Settings. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { settings, update } = useSettings();
  const { session } = useRepositories();
  const { colors, spacing } = useAppTheme();
  const audio = useAudioStatus();
  const adwamuhaOn = useAdwamuha().enabled;

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        {/* «أدومها» first and highlighted (owner); with it on, the reminders move into it. */}
        <AdwamuhaSettings />

        <ReadingSettings />

        <SettingsGroup title={t('settings.whileReading')}>
          <ToggleRow
            label={t('settings.keepScreenOn')}
            value={settings.keepScreenOn}
            onChange={(v) => void update('keepScreenOn', v)}
          />
          <RowDivider />
          <ToggleRow
            label={t('settings.restoreSession')}
            hint={t('settings.restoreSessionHint')}
            value={settings.restoreSession}
            onChange={(v) => {
              void update('restoreSession', v);
              // Off: forget a state saved earlier, so it is never restored.
              if (!v) void session.clear().catch(() => undefined);
            }}
          />
        </SettingsGroup>

        {adwamuhaOn ? null : <ReminderSettings />}

        <SettingsGroup title={t('settings.theme.title')}>
          <ThemePicker />
        </SettingsGroup>

        <SettingsGroup title={t('settings.feedback')}>
          <ToggleRow
            label={t('settings.haptics')}
            value={settings.hapticsEnabled}
            onChange={(v) => void update('hapticsEnabled', v)}
          />
          <RowDivider />
          <ToggleRow
            label={t('settings.nextDhikrVibration')}
            value={settings.nextDhikrVibration}
            onChange={(v) => void update('nextDhikrVibration', v)}
          />
          <RowDivider />
          <ToggleRow
            label={t('settings.completionVibration')}
            value={settings.completionVibration}
            onChange={(v) => void update('completionVibration', v)}
          />
          <RowDivider />
          <ToggleRow
            label={t('settings.tickSound')}
            value={settings.tickSound}
            onChange={(v) => void update('tickSound', v)}
          />
        </SettingsGroup>

        <SettingsGroup title={t('settings.audio')}>
          <LinkRow
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
            label={t('settings.backgroundPlayback')}
            value={settings.backgroundPlayback}
            onChange={(v) => void update('backgroundPlayback', v)}
          />
          <RowDivider />
          <ToggleRow
            label={t('settings.autoplayNext')}
            value={settings.autoplayNext}
            onChange={(v) => void update('autoplayNext', v)}
          />
          <RowDivider />
          <ToggleRow
            label={t('settings.audioCounts')}
            hint={t('settings.audioCountsHint')}
            value={settings.audioCounts}
            onChange={(v) => void update('audioCounts', v)}
          />
        </SettingsGroup>

        {/* The user's own data, safe in a file and in Android's backup (milestone 12). */}
        <BackupSettings />

        <SettingsGroup title={t('settings.support')}>
          <LinkRow label={t('about.title')} onPress={() => router.push('/about')} />
          <RowDivider />
          <LinkRow
            label={t('settings.privacy')}
            onPress={() => void Linking.openURL(APP_CONFIG.privacyPolicyUrl)}
          />
          {/* Only once the relay is deployed (APP_CONFIG.report.endpoint). */}
          {APP_CONFIG.report.endpoint ? (
            <>
              <RowDivider />
              <LinkRow label={t('report.title')} onPress={() => router.push('/report')} />
            </>
          ) : null}
        </SettingsGroup>
      </ScrollView>
    </SafeAreaView>
  );
}
