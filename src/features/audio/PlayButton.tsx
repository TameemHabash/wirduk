import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

import type { DhikrAudioPhase } from './useDhikrAudio';

/** Round play / pause button for one dhikr's recording (a spinner while it downloads). */
export function PlayButton({ phase, onPress }: { phase: DhikrAudioPhase; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
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
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {phase === 'loading' ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon
          name={phase === 'playing' ? 'pause' : 'play'}
          size={18}
          color={colors.primary}
          solid
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
