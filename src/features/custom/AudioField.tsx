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
  const { colors, spacing } = useAppTheme();
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

  /** A small button with an icon (design: soft, secondary, or red). */
  const button = (
    icon: IconName,
    label: string,
    onPress: () => void,
    kind: 'soft' | 'secondary' | 'danger',
    grow = false,
  ) => {
    const look = {
      soft: { background: colors.primarySoft, border: colors.primarySoft, text: colors.primaryInk },
      secondary: { background: colors.surface, border: colors.borderStrong, text: colors.text },
      danger: { background: colors.danger, border: colors.danger, text: colors.onDanger },
    }[kind];
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          grow && styles.fill,
          {
            borderColor: look.border,
            backgroundColor: look.background,
            gap: spacing.sm - 2,
            opacity: busy ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Icon name={icon} size={18} color={look.text} />
        <AppText key={label} roomy style={[styles.buttonText, { color: look.text }]}>
          {label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="label" tone="muted">
        {t('custom.audio')}
      </AppText>

      {recording ? (
        <View
          style={[styles.card, { borderColor: colors.danger, backgroundColor: colors.surface }]}
        >
          <View style={[styles.round, { backgroundColor: colors.dangerSoft }]}>
            <Icon name="mic" size={18} color={colors.danger} />
          </View>
          <AppText style={[styles.fill, styles.cardText]} accessibilityLiveRegion="polite">
            {t('custom.recording', { time: formatDuration(recorderState.durationMillis) })}
          </AppText>
          {button('stop', t('custom.stopRecording'), () => void stopRecording(), 'danger')}
        </View>
      ) : value ? (
        // Once there is audio, only the player (owner, 2026-11-25); removing it brings the
        // two buttons back.
        <View
          style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(playerStatus.playing ? 'custom.pause' : 'custom.play')}
            disabled={busy}
            onPress={() => (playerStatus.playing ? player.pause() : player.play())}
            style={[styles.round, { backgroundColor: colors.primarySoft }]}
          >
            <Icon
              name={playerStatus.playing ? 'pause' : 'play'}
              size={18}
              color={colors.primaryInk}
            />
          </Pressable>
          <View style={[styles.fill, { gap: 6 }]}>
            <AppText style={styles.cardText}>
              {playerStatus.duration > 0
                ? formatDuration(playerStatus.duration * 1000)
                : t('custom.audioReady')}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View
                style={[
                  styles.progress,
                  {
                    backgroundColor: colors.primary,
                    width: `${playedPercent(playerStatus.currentTime, playerStatus.duration)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('custom.removeAudio')}
            disabled={busy}
            onPress={() => onChange(null)}
            hitSlop={6}
            style={styles.remove}
          >
            <Icon name="trash" size={20} color={colors.danger} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.row, { gap: spacing.sm }]}>
          {button('mic', t('custom.record'), () => void startRecording(), 'soft', true)}
          {button('fileAudio', t('custom.pickFile'), () => void pickFile(), 'secondary', true)}
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

/** How much of the recording has played, 0–100. */
function playedPercent(current: number | undefined, duration: number | undefined): number {
  if (!duration || !current || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (current / duration) * 100));
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexWrap: 'wrap' },
  fill: { flex: 1 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  buttonText: { fontSize: 14, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
  },
  cardText: { fontSize: 15, lineHeight: 22 },
  round: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 4 },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
