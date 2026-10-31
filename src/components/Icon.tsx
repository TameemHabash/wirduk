import Svg, { Circle, Path } from 'react-native-svg';

import { useDirection } from '@/i18n/direction';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * Line icons drawn with SVG (24×24 grid, 1.8 stroke), matching the approved mockups.
 * Directional icons are drawn for left-to-right and mirrored in RTL.
 */
const ICONS = {
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="m20 20-3.5-3.5" />
    </>
  ),
  star: <Path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  /** Points back (left in LTR, right in RTL). */
  back: <Path d="m15 18-6-6 6-6" />,
  /** Points forward. */
  forward: <Path d="m9 18 6-6-6-6" />,
  down: <Path d="m6 9 6 6 6-6" />,
  up: <Path d="m18 15-6-6-6 6" />,
  reset: (
    <>
      <Path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <Path d="M3 3v5h5" />
    </>
  ),
  /** A tip (Adwamuha's design). */
  bulb: <Path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />,
  /** A ward done late (Adwamuha's design). */
  clock: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 8v4l3 2" />
    </>
  ),
  play: <Path d="M8 5v14l11-7z" />,
  pause: <Path d="M8 5v14M16 5v14" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  grip: <Path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" />,
  check: <Path d="m5 12 5 5 9-10" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  edit: (
    <>
      <Path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <Path d="m13.5 6.5 3 3" />
    </>
  ),
  mic: (
    <>
      <Path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  file: (
    <>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5" />
    </>
  ),
  trash: (
    <>
      <Path d="M4 7h16M10 11v6M14 11v6" />
      <Path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  stop: <Path d="M7 7h10v10H7z" />,
} as const;

export type IconName = keyof typeof ICONS;

const DIRECTIONAL: ReadonlySet<IconName> = new Set<IconName>(['back', 'forward']);
const FILLED_WHEN_SOLID: ReadonlySet<IconName> = new Set<IconName>(['star', 'play', 'stop']);

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /** Filled shape (e.g. a selected star). */
  solid?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color, solid = false, strokeWidth }: Props) {
  const { colors } = useAppTheme();
  const { isRtl } = useDirection();
  const stroke = color ?? colors.text;
  const filled = solid && FILLED_WHEN_SOLID.has(name);
  const width = strokeWidth ?? (name === 'grip' ? 3 : 1.8);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? stroke : 'none'}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={DIRECTIONAL.has(name) && isRtl ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {ICONS[name]}
    </Svg>
  );
}
