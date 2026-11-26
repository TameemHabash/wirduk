import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Icon } from '@/components/Icon';
import { useDirection } from '@/i18n/direction';
import { UI_FONTS } from '@/theme/fonts';
import { useAppTheme } from '@/theme/ThemeProvider';

import { OWNER_TEXTS } from './owner-texts';

const SIZE = 196;
/** The open space at the top, where the small star sits (radians). */
const GAP = 0.42;

/**
 * «مساري»'s path as a tasbih (owner, 2026-11-25): a bead per step from a small eight-point
 * star at the top, clockwise in Arabic (counterclockwise in left-to-right languages). The
 * steps reached are teal, this step gold and bigger, the rest empty; the step number inside.
 * Finished: every bead gold and a check.
 */
export function BeadPath({
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
  const { isRtl } = useDirection();
  const c = SIZE / 2;
  const r = c - 10;
  const at = (angle: number) => {
    const a = (isRtl ? angle : -angle) - Math.PI / 2;
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  };
  const label = finished
    ? t('adwamuha.masari.allDone', { total })
    : OWNER_TEXTS.labels.stepOf
        .replace('{{step}}', String(step))
        .replace('{{total}}', String(total));
  const star = at(0);
  const k = 6;
  // The star: a square and the same square turned 45°.
  const d = k * Math.SQRT2;

  return (
    <View accessible accessibilityLabel={label} style={styles.box}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill} testID="bead-path">
        <Circle cx={c} cy={c} r={r} stroke={colors.borderStrong} strokeWidth={1.5} fill="none" />
        {Array.from({ length: total }, (_, i) => {
          const p = at(GAP / 2 + ((2 * Math.PI - GAP) * i) / Math.max(1, total - 1));
          const here = !finished && i === step - 1;
          const reached = !finished && i < step - 1;
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={here ? 7.5 : 5.2}
              fill={finished || here ? colors.accent : reached ? colors.primary : colors.background}
              stroke={finished || here || reached ? 'none' : colors.borderStrong}
              strokeWidth={2}
            />
          );
        })}
        <Rect
          x={star.x - k}
          y={star.y - k}
          width={2 * k}
          height={2 * k}
          fill={colors.background}
          stroke={colors.accent}
          strokeWidth={1.4}
        />
        <Path
          d={`M${star.x} ${star.y - d} L${star.x + d} ${star.y} L${star.x} ${star.y + d} L${star.x - d} ${star.y} Z`}
          fill="none"
          stroke={colors.accent}
          strokeWidth={1.4}
        />
      </Svg>
      {finished ? (
        <>
          <Icon name="check" size={28} color={colors.accentInk} strokeWidth={2.2} />
          <AppText variant="caption" tone="muted" style={styles.of}>
            {t('adwamuha.masari.allDone', { total })}
          </AppText>
        </>
      ) : (
        <>
          <AppText style={styles.number}>{String(step)}</AppText>
          <AppText variant="caption" tone="muted" style={styles.of}>
            {t('adwamuha.masari.stepsOf', { total })}
          </AppText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SIZE,
    height: SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontFamily: UI_FONTS.semibold, fontSize: 46, lineHeight: 54 },
  of: { marginTop: 2 },
});
