import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Icon } from '@/components/ui/Icon';
import { useDirection } from '@/i18n/direction';
import { useAppTheme } from '@/theme/ThemeProvider';

const BEADS = 33;
/** Between one bead and the next lighting up (design: 16 ms, each over 450 ms). */
const STEP_MS = 16;
const BEAD_MS = 450;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A full tasbih circle (33 gold beads) around a check mark (redesign). The beads light up
 * one after another from the top, clockwise in Arabic, counterclockwise in left-to-right
 * languages (owner, 2026-11-25).
 */
export function BeadCircle({ size = 216 }: { size?: number }) {
  const { colors } = useAppTheme();
  const { isRtl } = useDirection();
  const reduceMotion = useReducedMotion();
  const c = size / 2;
  const ring = c - 10;
  const bead = Math.min(6.5, ((Math.PI * ring) / BEADS) * 0.42);
  const time = useSharedValue(reduceMotion ? 1 : 0);
  const total = STEP_MS * (BEADS - 1) + BEAD_MS;

  useEffect(() => {
    if (reduceMotion) return;
    time.value = withTiming(1, { duration: total, easing: Easing.linear });
  }, [reduceMotion, time, total]);

  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {Array.from({ length: BEADS }, (_, i) => {
          const a = ((isRtl ? 1 : -1) * 2 * Math.PI * i) / BEADS - Math.PI / 2;
          return (
            <Bead
              key={i}
              index={i}
              time={time}
              total={total}
              cx={c + ring * Math.cos(a)}
              cy={c + ring * Math.sin(a)}
              r={bead}
              color={colors.accent}
            />
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
          <Icon name="check" size={28} color={colors.primaryInk} strokeWidth={2.2} />
        </View>
      </View>
    </View>
  );
}

function Bead({
  index,
  time,
  total,
  cx,
  cy,
  r,
  color,
}: {
  index: number;
  time: SharedValue<number>;
  total: number;
  cx: number;
  cy: number;
  r: number;
  color: string;
}) {
  const start = (index * STEP_MS) / total;
  const span = BEAD_MS / total;
  const animatedProps = useAnimatedProps(() => {
    const p = Math.min(1, Math.max(0, (time.value - start) / span));
    return { opacity: p, r: r * (0.4 + 0.6 * p) };
  });
  return <AnimatedCircle cx={cx} cy={cy} r={r} fill={color} animatedProps={animatedProps} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  mark: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
});
