import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useAppTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  /** Ring color when full. */
  completeColor?: string;
  children?: ReactNode;
}

/** Circular progress (gold), with content in the middle. Starts at the top, fills clockwise. */
export function ProgressRing({ progress, size = 112, stroke = 7, completeColor, children }: Props) {
  const { colors } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = useSharedValue(progress);

  useEffect(() => {
    const target = Math.max(0, Math.min(1, progress));
    value.value = reduceMotion ? target : withTiming(target, { duration: 220 });
  }, [progress, reduceMotion, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
    // A zero-length arc with round caps would still draw a dot.
    strokeOpacity: value.value <= 0.001 ? 0 : 1,
  }));

  const full = progress >= 1;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={full && completeColor ? completeColor : colors.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
});
