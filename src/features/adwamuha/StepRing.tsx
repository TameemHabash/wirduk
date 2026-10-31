import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useAppTheme } from '@/theme/ThemeProvider';

import { OWNER_TEXTS } from './owner-texts';

const SIZE = 150;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2 - 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * «مساري»'s ring (design): how far along the path, the step number inside.
 * After the last step: a gold ring with a check.
 */
export function StepRing({
  step,
  total,
  finished,
}: {
  step: number;
  total: number;
  finished: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const part = finished ? 1 : Math.min(1, step / total);
  const label = finished
    ? t('adwamuha.masari.allDone', { total })
    : OWNER_TEXTS.labels.stepOf
        .replace('{{step}}', String(step))
        .replace('{{total}}', String(total));
  return (
    <View accessible accessibilityLabel={label} style={styles.ring}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colors.surfaceMuted}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={finished ? colors.accent : colors.primary}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={CIRCUMFERENCE * (1 - part)}
          fill="none"
          // Start at the top and go round the way the text reads.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      {finished ? (
        <>
          <Icon name="check" size={44} color={colors.accent} />
          <AppText variant="caption" tone="muted">
            {t('adwamuha.masari.allDone', { total })}
          </AppText>
        </>
      ) : (
        <>
          <AppText variant="display" style={styles.number}>
            {step}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('adwamuha.masari.stepsOf', { total })}
          </AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: { position: 'absolute', top: 0, left: 0 },
  number: { lineHeight: 52 },
});
