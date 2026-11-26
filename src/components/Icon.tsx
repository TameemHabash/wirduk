import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useDirection } from '@/i18n/direction';
import { useAppTheme } from '@/theme/ThemeProvider';

/**
 * Line icons drawn with SVG (24×24 grid, 1.75 stroke): the redesign's icon set (2026-11-26).
 * Directional icons (`back`, `forward`) are drawn for left-to-right and mirrored in RTL.
 * Filled parts use `currentColor`, the icon's color.
 */
const ICONS = {
  home: (
    <Path d="M3.8 10.6 12 3.8l8.2 6.8V19a1.6 1.6 0 0 1-1.6 1.6H15v-6.1H9v6.1H5.4A1.6 1.6 0 0 1 3.8 19z" />
  ),
  book: (
    <Path d="M12 6.6C10.3 5.3 7.9 4.7 4 4.7v13.4c3.9 0 6.3.6 8 1.9 1.7-1.3 4.1-1.9 8-1.9V4.7c-3.9 0-6.3.6-8 1.9zM12 6.6V20" />
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="6.5" />
      <Path d="m20 20-4.2-4.2" />
    </>
  ),
  /** Points back (left in LTR, right in RTL). The design's `i-fwd`, drawn for RTL. */
  back: <Path d="M15 5.5 8.5 12l6.5 6.5" />,
  /** Points forward. The design's `i-back`, drawn for RTL. */
  forward: <Path d="m9 5.5 6.5 6.5L9 18.5" />,
  down: <Path d="m6 9.5 6 6 6-6" />,
  up: <Path d="m6 14.5 6-6 6 6" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  moon: (
    <>
      <Path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1z" />
      <Path d="M17.5 3v3.2M15.9 4.6h3.2" />
    </>
  ),
  star: <Path d="m12 3.2 2.7 5.5 6 .9-4.35 4.2 1 6L12 17l-5.35 2.8 1-6L3.3 9.6l6-.9z" />,
  beads: (
    <>
      <G fill="currentColor" stroke="none">
        <Circle cx="12" cy="4.4" r="1.45" />
        <Circle cx="16.3" cy="6.2" r="1.45" />
        <Circle cx="18" cy="10.5" r="1.45" />
        <Circle cx="16.3" cy="14.8" r="1.45" />
        <Circle cx="7.7" cy="14.8" r="1.45" />
        <Circle cx="6" cy="10.5" r="1.45" />
        <Circle cx="7.7" cy="6.2" r="1.45" />
      </G>
      <Path d="M12 15.6v3.6M10.2 22.2 12 19.2l1.8 3" />
      <Circle cx="12" cy="15.4" r="1.1" />
    </>
  ),
  path: (
    <>
      <Circle cx="5" cy="19" r="1.7" />
      <Path d="M6.8 18.6c3-.6 3.5-3.6 6.2-4.2 2.4-.6 4.6-.2 5.5-2.4" strokeDasharray="0.01 2.6" />
      <Path d="M18.5 12V3.5l3 1.6-3 1.6" />
    </>
  ),
  sprout: (
    <Path d="M12 21v-8.5M12 12.5C12 9 9.4 6.3 5 6.3 5 10 7.6 12.5 12 12.5zM12 14.6c0-3.6 2.5-6.3 7-6.3 0 3.6-2.6 6.3-7 6.3zM8 21h8" />
  ),
  play: (
    <Path
      d="M8.5 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.7 5.1a.8.8 0 0 0-1.2.7z"
      fill="currentColor"
      stroke="none"
    />
  ),
  pause: (
    <>
      <Rect x="6.5" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <Rect x="13.9" y="5" width="3.6" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  stop: <Rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none" />,
  head: (
    <>
      <Path d="M4 16v-4a8 8 0 0 1 16 0v4" />
      <Path d="M4 15.5a2 2 0 0 1 2-2h1.2v7H6a2 2 0 0 1-2-2zM20 15.5a2 2 0 0 0-2-2h-1.2v7H18a2 2 0 0 0 2-2z" />
    </>
  ),
  download: <Path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />,
  check: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  done: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="m8.3 12.3 2.6 2.6 5-5.2" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 8v4.2l2.8 1.8" />
    </>
  ),
  reset: (
    <>
      <Path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.3" />
      <Path d="M3.5 3.8v4.5H8" />
    </>
  ),
  bell: <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.8a2.2 2.2 0 0 0 4 0" />,
  size: <Path d="m3 19 5-13 5 13M5 14.5h6M15 19l3.5-8.5L22 19M16.2 16.2h4.6" />,
  nib: (
    <>
      <Path d="M12 3 6 12.5l6 8.5 6-8.5zM12 3v7.5" />
      <Circle cx="12" cy="12.6" r="1.7" />
    </>
  ),
  /** Half filled: "as the phone" (the theme). */
  theme: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" />
    </>
  ),
  screen: (
    <>
      <Rect x="7.5" y="3" width="9" height="18" rx="2.4" />
      <Path d="M11 18h2M3.5 8.5l1.6.9M3.5 15.5l1.6-.9M20.5 8.5l-1.6.9M20.5 15.5l-1.6-.9" />
    </>
  ),
  vibrate: (
    <>
      <Rect x="8" y="4" width="8" height="16" rx="2.2" />
      <Path d="M4.6 9v6M2.4 10.5v3M19.4 9v6M21.6 10.5v3" />
    </>
  ),
  sound: (
    <>
      <Path d="M4 9.5h3.4L12 6v12l-4.6-3.5H4z" />
      <Path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10" />
    </>
  ),
  audioOff: <Path d="M4 9.5h3.4L12 6v12l-4.6-3.5H4zM16 9.5l5 5M21 9.5l-5 5" />,
  history: (
    <>
      <Path d="M3.8 12a8.2 8.2 0 1 0 2.5-5.9L3.8 8.5" />
      <Path d="M3.8 4v4.5h4.5M12 8v4.3l2.8 1.7" />
    </>
  ),
  shield: (
    <>
      <Path d="M12 3 19 6v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
      <Path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  fileUp: (
    <>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
    </>
  ),
  fileAudio: (
    <>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5" />
      <Circle cx="10.5" cy="16.5" r="1.8" />
      <Path d="M12.3 16.5V11l2.7 1" />
    </>
  ),
  share: (
    <>
      <Circle cx="17.5" cy="5.5" r="2.5" />
      <Circle cx="6.5" cy="12" r="2.5" />
      <Circle cx="17.5" cy="18.5" r="2.5" />
      <Path d="m8.7 10.8 6.6-4M8.7 13.2l6.6 4" />
    </>
  ),
  flag: <Path d="M5.5 21V4M5.5 4H17l-2.2 4 2.2 4H5.5" />,
  info: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 11v5.5M12 7.8v.1" />
    </>
  ),
  lock: (
    <>
      <Rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  close: <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  edit: (
    <>
      <Path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <Path d="m13.5 6.5 3 3" />
    </>
  ),
  trash: (
    <>
      <Path d="M4 7h16M10 11v6M14 11v6" />
      <Path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  grip: (
    <G fill="currentColor" stroke="none">
      <Circle cx="9" cy="6" r="1.5" />
      <Circle cx="15" cy="6" r="1.5" />
      <Circle cx="9" cy="12" r="1.5" />
      <Circle cx="15" cy="12" r="1.5" />
      <Circle cx="9" cy="18" r="1.5" />
      <Circle cx="15" cy="18" r="1.5" />
    </G>
  ),
  mic: (
    <>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>
  ),
  /** A tip. */
  bulb: <Path d="M9 18h6M10 21.5h4M12 2.5a6.8 6.8 0 0 0-4 12.3V17h8v-2.2a6.8 6.8 0 0 0-4-12.3z" />,
  calendar: (
    <>
      <Rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  external: (
    <Path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  ),
  offline: (
    <Path d="M3 3l18 18M8.6 8.7A11 11 0 0 0 2.5 11.5M12 7.5a11 11 0 0 1 9.5 4M5.5 14.5a8 8 0 0 1 4.6-2.3M15 12.6a8 8 0 0 1 3.5 1.9M9 17.5a4.3 4.3 0 0 1 6 0" />
  ),
  image: (
    <>
      <Rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <Circle cx="9" cy="10" r="1.6" />
      <Path d="m20.5 16-5-5-8.2 8.5" />
    </>
  ),
  /** An eight-point star (the khatam): two squares, one turned 45°. */
  khatam: (
    <>
      <Rect x="6.3" y="6.3" width="11.4" height="11.4" />
      <Path d="M12 3.94 20.06 12 12 20.06 3.94 12z" />
    </>
  ),
  undo: (
    <>
      <Path d="M9 14 4 9l5-5" />
      <Path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  order: (
    <>
      <Path d="M10 6h10M10 12h10M10 18h10" />
      <Path d="M4 6h1.5M4 12h1.5M4 18h1.5" strokeWidth={2.4} />
    </>
  ),
  /** A break (a cup). */
  pauseCup: (
    <>
      <Path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <Path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c0 1.5 1 1.5 1 3M12 3.5c0 1.5 1 1.5 1 3" />
    </>
  ),
  step: (
    <>
      <Path d="M4 19h5v-5h5V9h5V5" />
      <Path d="M4 19v-.01" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

const DIRECTIONAL: ReadonlySet<IconName> = new Set<IconName>(['back', 'forward']);
const FILLED_WHEN_SOLID: ReadonlySet<IconName> = new Set<IconName>(['star']);

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
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      color={stroke}
      fill={filled ? stroke : 'none'}
      stroke={stroke}
      strokeWidth={strokeWidth ?? 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={DIRECTIONAL.has(name) && isRtl ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      {ICONS[name]}
    </Svg>
  );
}
