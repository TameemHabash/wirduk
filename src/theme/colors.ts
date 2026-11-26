/**
 * Color tokens: "paper and ink", from the logo (teal, gold, cream).
 * The redesign approved on 2026-11-26 (`:root` and the dark theme of the design page).
 * Contrast (WCAG) is checked in colors.test.ts: every text color passes AA on the
 * surfaces it is used on. `accent` (gold) is for rings, beads, badges and icons only;
 * small gold text uses `accentInk`.
 */
export interface ColorTokens {
  background: string;
  surface: string;
  /** Quiet fills: tracks, steppers, pressed rows. */
  surfaceMuted: string;
  border: string;
  /** Stronger lines: secondary buttons, fields, switches off. */
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  /** A soft teal fill (icon tiles, soft buttons, the selected tab). */
  primarySoft: string;
  /** Teal text and icons on `primarySoft`, `surface` and `background`. */
  primaryInk: string;
  accent: string;
  /** Small gold text (badges, labels) on light fills. */
  accentInk: string;
  accentSoft: string;
  accentLine: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  /** The toast's card. */
  toast: string;
  /** A switch's knob. */
  knob: string;
  /** The screen behind a dialog or a sheet, dimmed. */
  scrim: string;
  /** The golden morning card (Home, «وردك اليوم»): a gradient from → to. */
  morningFrom: string;
  morningTo: string;
  /** The golden evening card. */
  eveningFrom: string;
  eveningTo: string;
  /** A light box inside the golden cards. */
  heroBox: string;
  /** The sun on the morning card. */
  sun: string;
  /**
   * The user's own categories and adhkar: a warm sand tint, so they look
   * slightly different from shipped content. On customSurface, text and
   * textMuted pass AA; textFaint does not, so faint notes stay on `surface`.
   */
  customSurface: string;
  customBorder: string;
  customAccent: string;
}

export type ColorScheme = 'light' | 'dark';

export const COLORS: Record<ColorScheme, ColorTokens> = {
  light: {
    background: '#F5F0E6',
    surface: '#FFFCF5',
    surfaceMuted: '#EDE5D4',
    border: '#E0D6C2',
    borderStrong: '#D1C6AF',
    text: '#132427',
    textMuted: '#4D5F63',
    // The design's #637377, a shade darker: faint text now sits on the page too (AA).
    textFaint: '#617074',
    primary: '#16606A',
    onPrimary: '#FFFFFF',
    primarySoft: '#DCEAE7',
    primaryInk: '#16606A',
    accent: '#A47A22',
    // The design's #86611A, a shade darker: AA on accentSoft too.
    accentInk: '#85611A',
    accentSoft: '#F2E5C6',
    accentLine: '#E3CF9F',
    danger: '#B3261E',
    dangerSoft: '#F9E1DE',
    onDanger: '#FFFFFF',
    toast: '#FFFFFF',
    knob: '#FFFFFF',
    scrim: 'rgba(10, 20, 22, 0.45)',
    morningFrom: '#FBE4BA',
    morningTo: '#FBF4E6',
    eveningFrom: '#F3D39A',
    eveningTo: '#FBF1E0',
    heroBox: 'rgba(255, 255, 255, 0.62)',
    sun: '#E09D35',
    customSurface: '#FAF1DD',
    customBorder: '#E8D3A2',
    customAccent: '#7A5B12',
  },
  dark: {
    background: '#0B1416',
    surface: '#122024',
    surfaceMuted: '#192B2F',
    border: '#23363A',
    borderStrong: '#2F464A',
    text: '#EEE7D6',
    textMuted: '#A8B4B5',
    textFaint: '#7E8D8F',
    primary: '#6FC2CA',
    onPrimary: '#0B1416',
    primarySoft: '#14353A',
    primaryInk: '#7FCBD2',
    accent: '#D8B765',
    accentInk: '#E0C27A',
    accentSoft: '#262115',
    accentLine: '#463A1F',
    danger: '#F2B8B5',
    dangerSoft: '#3A2220',
    onDanger: '#3A0E0B',
    toast: '#1E3135',
    knob: '#EEE7D6',
    scrim: 'rgba(0, 0, 0, 0.55)',
    morningFrom: '#2C2A1C',
    morningTo: '#132226',
    eveningFrom: '#30281A',
    eveningTo: '#132226',
    heroBox: 'rgba(255, 255, 255, 0.05)',
    sun: '#E9B556',
    customSurface: '#1E1A10',
    customBorder: '#423820',
    customAccent: '#E2C474',
  },
};
