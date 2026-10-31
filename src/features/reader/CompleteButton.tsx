import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

/**
 * Fills the current dhikr's count without tapping, then the reader moves on.
 * Kept in the row above the text, away from the tap zone, so a counting tap
 * never presses it by mistake.
 */
export function CompleteButton({ done, onPress }: { done: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('reader.completeLabel')}
      accessibilityState={{ disabled: done }}
      disabled={done}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        {
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
        done && { opacity: 0.5 },
      ]}
    >
      <Icon name="check" size={18} color={colors.primary} />
      <AppText variant="bodyStrong" style={{ color: colors.primary }}>
        {t('reader.complete')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    borderWidth: 1,
  },
});
