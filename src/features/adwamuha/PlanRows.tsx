import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LinkRow, RowDivider } from '@/features/settings/SettingsParts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { OWNER_TEXTS } from './owner-texts';

/**
 * The plan's two rows, each with a note (owner, 2026-11-25), in «مساري» and in «أدومها»
 * settings: «خفّف وردك أو خذ استراحة» (the step-back sheet) and «عدّل الخطة» (the plan
 * editor). On the finished path, «إيقاف أدومها» takes the first row's place.
 */
export function PlanRows({
  finished = false,
  onEase,
  onTurnOff,
  bare = false,
}: {
  finished?: boolean;
  onEase: () => void;
  onTurnOff?: () => void;
  /** Only the rows (inside a settings group that already draws the box). */
  bare?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  return (
    <View
      style={
        bare
          ? undefined
          : [styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]
      }
    >
      {finished && onTurnOff ? (
        <LinkRow
          icon="sprout"
          iconTone="plain"
          label={t('adwamuha.masari.turnOff')}
          onPress={onTurnOff}
        />
      ) : (
        <LinkRow
          icon="pauseCup"
          label={t('adwamuha.rows.easeTitle')}
          hint={t('adwamuha.rows.easeNote')}
          onPress={onEase}
        />
      )}
      <RowDivider />
      <LinkRow
        icon="step"
        label={OWNER_TEXTS.labels.editPlan}
        hint={t('adwamuha.rows.planNote', { passed: OWNER_TEXTS.labels.stepPassed })}
        onPress={() => router.push('/adwamuha/plan')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
});
