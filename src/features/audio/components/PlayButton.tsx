import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import type { DhikrAudioPhase } from '@/features/audio/hooks/useDhikrAudio';

/** Round play / pause button for one dhikr's recording (a spinner while it downloads). */
export function PlayButton({ phase, onPress }: { phase: DhikrAudioPhase; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const playing = phase === 'playing';
  const label =
    phase === 'loading'
      ? t('audio.loading')
      : phase === 'playing'
        ? t('audio.pause')
        : t('audio.play');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: phase === 'loading' }}
      onPress={onPress}
      hitSlop={4}
      // A new view when it starts or stops playing: the Galaxy S21+ drew a round view
      // square after its border changed in place (2026-11-01).
      key={playing ? 'on' : 'off'}
      style={({ pressed }) => [
        styles.button,
        playing
          ? { backgroundColor: colors.primary, borderColor: colors.primarySoft, borderWidth: 4 }
          : { backgroundColor: colors.primarySoft },
        pressed && { opacity: 0.85 },
      ]}
    >
      {phase === 'loading' ? (
        <ActivityIndicator size="small" color={colors.primaryInk} />
      ) : (
        <Icon
          name={playing ? 'pause' : 'play'}
          size={18}
          color={playing ? colors.onPrimary : colors.primaryInk}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
