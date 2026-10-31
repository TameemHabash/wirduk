import Svg, { Circle, Path } from 'react-native-svg';

import { useAppTheme } from '@/theme/ThemeProvider';

const BEADS = 33;

/** A full tasbih circle (33 beads, from the logo) around a check mark. */
export function BeadCircle({ size = 148 }: { size?: number }) {
  const { colors } = useAppTheme();
  const c = size / 2;
  const ring = size * 0.41;
  const bead = size * 0.035;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityElementsHidden>
      {Array.from({ length: BEADS }, (_, i) => {
        const a = (i / BEADS) * 2 * Math.PI - Math.PI / 2;
        return (
          <Circle
            key={i}
            cx={c + ring * Math.cos(a)}
            cy={c + ring * Math.sin(a)}
            r={bead}
            fill={colors.accent}
            opacity={0.55 + 0.45 * (i / (BEADS - 1))}
          />
        );
      })}
      <Circle cx={c} cy={c} r={size * 0.17} fill={colors.accentSoft} />
      <Path
        d={`M${c - size * 0.07} ${c} l${size * 0.045} ${size * 0.045} l${size * 0.09} ${-size * 0.1}`}
        stroke={colors.primary}
        strokeWidth={size * 0.03}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
