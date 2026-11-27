import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import type { CountedItem } from '@/features/reader/state/counter-store';
import { useCount } from '@/features/reader/state/useCounters';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { TOUCH_TARGET } from '@/theme/tokens';

/**
 * Fills the current dhikr's count without tapping, then the reader moves on.
 * Kept in the row above the text, away from the tap zone, so a counting tap
 * never presses it by mistake. Greyed out once the dhikr is complete.
 */
export function CompleteButton({ dhikr, onPress }: { dhikr: CountedItem; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useAppTheme();
  const done = useCount(dhikr.id) >= dhikr.count;
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
          gap: spacing.xs + 2,
          paddingHorizontal: spacing.md + 2,
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
        done && { opacity: 0.45 },
      ]}
    >
      <Icon name="done" size={18} color={colors.text} />
      <AppText key={String(done)} roomy style={[styles.label, { color: colors.text }]}>
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
  label: { fontFamily: UI_FONTS.medium, fontSize: 14, lineHeight: 20 },
});
