/**
 * Color tokens: "paper and ink", from the logo (teal, gold, cream).
 * Approved in docs/design/proposal.html. Contrast (WCAG) measured there:
 * text and textMuted pass AA everywhere; textFaint passes AA on `surface`.
 * `accent` (gold) is for rings, badges and icons only — not for small text.
 */
export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  danger: string;
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
    background: '#F7F3EA',
    surface: '#FFFDF8',
    surfaceMuted: '#EFE8D9',
    border: '#E4DCCB',
    text: '#17292E',
    textMuted: '#526468',
    textFaint: '#66767A',
    primary: '#1B6872',
    onPrimary: '#FFFFFF',
    accent: '#A9832F',
    accentSoft: '#F1E6CC',
    danger: '#B3261E',
    customSurface: '#FBF3E2',
    customBorder: '#E9D6A8',
    customAccent: '#7E5F14',
  },
  dark: {
    background: '#0E1719',
    surface: '#152225',
    surfaceMuted: '#1C2D31',
    border: '#27393D',
    text: '#EDE6D6',
    textMuted: '#A9B5B6',
    textFaint: '#7F8E90',
    primary: '#6EC1C9',
    onPrimary: '#0E1719',
    accent: '#D9B866',
    accentSoft: '#2A2618',
    danger: '#F2B8B5',
    customSurface: '#211D12',
    customBorder: '#43391F',
    customAccent: '#E2C474',
  },
};
