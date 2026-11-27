import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { MAX_STEP_WEEKS, MIN_STEP_WEEKS } from '@/features/adwamuha/logic/plan-edit';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

/** The weeks of a step, 1–8, with + and − (design `.mini-step`). */
export function WeeksStepper({
  weeks,
  step,
  onFewer,
  onMore,
}: {
  weeks: number;
  step: number;
  onFewer: () => void;
  onMore: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const button = (
    icon: 'plus' | 'minus',
    label: string,
    onPress: () => void,
    disabled: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={[styles.miniButton, { backgroundColor: colors.surface }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={15} color={colors.primaryInk} />
    </Pressable>
  );
  return (
    <View style={[styles.row, styles.mini, { backgroundColor: colors.surfaceMuted }]}>
      {button('plus', t('adwamuha.plan.moreWeeks', { step }), onMore, weeks >= MAX_STEP_WEEKS)}
      <AppText style={styles.weeks}>{t('adwamuha.plan.weeks', { count: weeks })}</AppText>
      {button('minus', t('adwamuha.plan.fewerWeeks', { step }), onFewer, weeks <= MIN_STEP_WEEKS)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  mini: { gap: 6, borderRadius: 11, padding: 3 },
  miniButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeks: {
    fontFamily: UI_FONTS.semibold,
    fontSize: 13,
    lineHeight: 20,
    minWidth: 62,
    textAlign: 'center',
  },
});
