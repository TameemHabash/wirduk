import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/ThemeProvider';

export type Period = 'morning' | 'evening';

/**
 * The golden card of Home (redesign): the morning or evening gradient, a faint khatam
 * pattern and, when `sky`, the sun's (or the moon's) path in its top end corner.
 */
export function GoldCard({
  period,
  sky = false,
  children,
  style,
}: {
  period: Period;
  sky?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const from = period === 'morning' ? colors.morningFrom : colors.eveningFrom;
  const to = period === 'morning' ? colors.morningTo : colors.eveningTo;
  return (
    <View style={[styles.card, { borderColor: colors.accentLine, backgroundColor: to }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <LinearGradient id={`g${id}`} x1="0.3" y1="0" x2="0.7" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="0.72" stopColor={to} />
          </LinearGradient>
          <Pattern id={`p${id}`} width="44" height="44" patternUnits="userSpaceOnUse">
            <G fill="none" stroke={colors.accent} strokeWidth="1.1" opacity="0.13">
              <Rect x="13" y="13" width="18" height="18" />
              <Path d="M22 9.27 34.73 22 22 34.73 9.27 22z" />
              <Circle cx="0" cy="0" r="5" />
              <Circle cx="44" cy="0" r="5" />
              <Circle cx="0" cy="44" r="5" />
              <Circle cx="44" cy="44" r="5" />
            </G>
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#g${id})`} />
        <Rect width="100%" height="100%" fill={`url(#p${id})`} />
      </Svg>
      {sky ? <Sky period={period} /> : null}
      {children}
    </View>
  );
}

/** The sun's path with the sun, or the moon and two stars (design `.sky`). */
function Sky({ period }: { period: Period }) {
  const { colors } = useAppTheme();
  const ink = colors.accentInk;
  return (
    <View pointerEvents="none" style={styles.sky}>
      <Svg width={150} height={88} viewBox="0 0 160 90">
        <Path d="M8 80h144" stroke={ink} opacity={0.25} fill="none" />
        <Path
          d="M26 80a54 54 0 0 1 108 0"
          fill="none"
          stroke={ink}
          strokeDasharray="1.5 5"
          strokeLinecap="round"
          opacity={0.45}
        />
        {period === 'morning' ? (
          <Circle cx="118" cy="46" r="10" fill={colors.sun} />
        ) : (
          <>
            <Path d="M92 32a11 11 0 1 0 12 15 8.5 8.5 0 0 1-12-15z" fill={colors.accent} />
            <Circle cx="122" cy="28" r="1.4" fill={colors.accent} />
            <Circle cx="132" cy="50" r="1" fill={colors.accent} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, borderWidth: 1, padding: 18, gap: 12, overflow: 'hidden' },
  sky: { position: 'absolute', top: -4, end: -6 },
});
