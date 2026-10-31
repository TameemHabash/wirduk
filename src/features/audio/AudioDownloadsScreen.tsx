import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { APP_CONFIG } from '@/config/app-config';
import { useAppTheme } from '@/theme/ThemeProvider';

import { type DownloadScope, toMegabytes } from './audio-plan';
import { useAudio } from './AudioProvider';
import { useAudioStatus } from './useAudioStatus';

/** Each download's words: the morning and evening recordings, or every recording. */
const SCOPE_TEXT = {
  morningEvening: {
    title: 'audio.downloads.morningEvening',
    download: 'audio.downloads.downloadMorningEvening',
    allDone: 'audio.downloads.allDoneMorningEvening',
  },
  all: {
    title: 'audio.downloads.everything',
    download: 'audio.downloads.downloadAll',
    allDone: 'audio.downloads.allDone',
  },
} as const;

/**
 * Settings → audio: download the morning and evening recordings for offline use
 * (owner, 2026-10-30: "download every recording" stays in the code but is not
 * shown, `APP_CONFIG.audio.showDownloadAll`), or delete the downloads.
 */
export function AudioDownloadsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const { downloadAll, deleteAll } = useAudio();
  const everything = useAudioStatus('all');

  const confirmDelete = () =>
    Alert.alert(t('audio.downloads.deleteConfirmTitle'), t('audio.downloads.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('audio.downloads.deleteConfirm'),
        style: 'destructive',
        onPress: () => void deleteAll(),
      },
    ]);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <AppText tone="muted">{t('audio.downloads.intro')}</AppText>
        <DownloadBox scope="morningEvening" />
        {APP_CONFIG.audio.showDownloadAll ? <DownloadBox scope="all" /> : null}
        {/* Every recording on the phone, also those downloaded by playing them. */}
        {everything && everything.downloadedFiles > 0 && downloadAll.phase !== 'running' ? (
          <Button title={t('audio.downloads.delete')} kind="danger" onPress={confirmDelete} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/** One download: what is on the phone, then its button, its progress or "all there". */
function DownloadBox({ scope }: { scope: DownloadScope }) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const { downloadAll, startDownloadAll, cancelDownloadAll } = useAudio();
  const plan = useAudioStatus(scope);
  const text = SCOPE_TEXT[scope];
  if (!plan) return null;

  const mine = downloadAll.phase !== 'idle' && downloadAll.scope === scope;
  const running = mine && downloadAll.phase === 'running' ? downloadAll.progress : null;
  const busy = downloadAll.phase === 'running';
  const stopped = mine && downloadAll.phase === 'stopped' ? downloadAll.reason : null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.lg,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <View style={{ gap: spacing.xs }}>
        <AppText variant="label" tone="muted">
          {t(text.title)}
        </AppText>
        <AppText variant="bodyStrong">
          {t('audio.downloads.downloaded', { done: plan.downloadedFiles, count: plan.totalFiles })}
        </AppText>
        <AppText tone="muted">
          {t('audio.downloads.sizeOf', {
            done: toMegabytes(plan.downloadedBytes),
            total: toMegabytes(plan.totalBytes),
          })}
        </AppText>
      </View>

      {running ? (
        <View style={{ gap: spacing.sm }}>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('audio.downloads.progressLabel')}
            accessibilityValue={{
              min: 0,
              max: Math.max(1, running.totalBytes),
              now: running.doneBytes,
            }}
            style={[styles.track, { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm }]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${running.totalBytes ? (running.doneBytes / running.totalBytes) * 100 : 0}%`,
                  backgroundColor: colors.primary,
                  borderRadius: radii.sm,
                },
              ]}
            />
          </View>
          <AppText variant="caption" tone="muted">
            {t('audio.downloads.running', { done: running.doneFiles, total: running.totalFiles })}
          </AppText>
          <Button
            title={t('audio.downloads.cancel')}
            kind="secondary"
            onPress={cancelDownloadAll}
          />
        </View>
      ) : plan.missing.length === 0 && plan.totalFiles > 0 ? (
        <AppText tone="primary">{t(text.allDone)}</AppText>
      ) : (
        <Button
          title={
            plan.downloadedFiles === 0
              ? t(text.download, { mb: toMegabytes(plan.missingBytes) })
              : t('audio.downloads.downloadRest', { mb: toMegabytes(plan.missingBytes) })
          }
          disabled={busy}
          onPress={() => startDownloadAll(scope)}
        />
      )}

      {stopped ? (
        stopped === 'cancelled' ? (
          <AppText tone="muted">{t('audio.downloads.cancelled')}</AppText>
        ) : (
          <AppText tone="danger" accessibilityRole="alert">
            {t(`audio.errors.${stopped}`)}
          </AppText>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, overflow: 'hidden' },
  fill: { height: '100%' },
});
