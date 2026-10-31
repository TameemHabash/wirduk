import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon, type IconName } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

import { MAX_PICKED_AUDIO_BYTES, formatDuration, isPlayableAudio } from './audio-files';
import { customAudioUri, storeCustomAudio } from './custom-audio';

interface Props {
  /** Stored file name, or null for no audio. */
  value: string | null;
  onChange: (fileName: string | null) => void;
}

/** Record with the microphone, pick a file, play it back, or remove it. */
export function AudioField({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useAppTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const player = useAudioPlayer(value ? customAudioUri(value) : null);
  const playerStatus = useAudioPlayerStatus(player);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Rewind when playback ends, so "play" starts from the beginning again.
  useEffect(() => {
    if (playerStatus.didJustFinish) void player.seekTo(0);
  }, [playerStatus.didJustFinish, player]);

  const recording = recorderState.isRecording;

  const startRecording = async () => {
    setMessage(null);
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setMessage(t('custom.micDenied'));
      return;
    }
    if (playerStatus.playing) player.pause();
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (!recorder.uri) throw new Error('No recording file');
      onChange(await storeCustomAudio(recorder.uri));
    } catch {
      setMessage(t('custom.audioError'));
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    setMessage(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    if (!isPlayableAudio(asset.name, asset.mimeType)) {
      setMessage(t('custom.notAudio'));
      return;
    }
    if ((asset.size ?? 0) > MAX_PICKED_AUDIO_BYTES) {
      setMessage(t('custom.fileTooBig', { mb: Math.round(MAX_PICKED_AUDIO_BYTES / 1024 / 1024) }));
      return;
    }
    setBusy(true);
    try {
      onChange(await storeCustomAudio(asset.uri, asset.name));
    } catch {
      setMessage(t('custom.audioError'));
    } finally {
      setBusy(false);
    }
  };

  const button = (icon: IconName, label: string, onPress: () => void, tone?: 'danger') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: colors.border,
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderRadius: radii.md,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
          opacity: busy ? 0.5 : 1,
        },
      ]}
    >
      <Icon name={icon} size={18} color={tone === 'danger' ? colors.danger : colors.primary} />
      <AppText variant="label" tone={tone === 'danger' ? 'danger' : 'primary'}>
        {label}
      </AppText>
    </Pressable>
  );

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" tone="muted">
        {t('custom.audio')}
      </AppText>

      {recording ? (
        <View style={[styles.row, { gap: spacing.sm }]}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <AppText style={styles.fill} accessibilityLiveRegion="polite">
            {t('custom.recording', { time: formatDuration(recorderState.durationMillis) })}
          </AppText>
          {button('stop', t('custom.stopRecording'), () => void stopRecording())}
        </View>
      ) : value ? (
        <View style={[styles.row, styles.wrap, { gap: spacing.sm }]}>
          {button(
            playerStatus.playing ? 'pause' : 'play',
            t(playerStatus.playing ? 'custom.pause' : 'custom.play'),
            () => (playerStatus.playing ? player.pause() : player.play()),
          )}
          <AppText variant="caption" tone="muted" style={styles.fill}>
            {playerStatus.duration > 0
              ? formatDuration(playerStatus.duration * 1000)
              : t('custom.audioReady')}
          </AppText>
          {button('trash', t('custom.removeAudio'), () => onChange(null), 'danger')}
        </View>
      ) : (
        <View style={[styles.row, styles.wrap, { gap: spacing.sm }]}>
          {button('mic', t('custom.record'), () => void startRecording())}
          {button('file', t('custom.pickFile'), () => void pickFile())}
        </View>
      )}

      {message ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  fill: { flex: 1 },
  button: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
