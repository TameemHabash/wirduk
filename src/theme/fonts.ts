/**
 * Font registry.
 *
 * Every font file is embedded at build time (see `app.config.ts`) and its
 * file name equals its PostScript name, so the same `fontFamily` string works
 * on Android (file name) and iOS (PostScript name).
 *
 * All fonts are SIL OFL-1.1. Sources and hashes: assets/fonts/SOURCES.md.
 * KFGQPC Uthmanic Hafs is NOT included: its license forbids reproduction
 * without written approval from the King Fahd Complex.
 *
 * No React Native imports: settings validation (plain TS) reads this file.
 */

/** Interface font. Use these families instead of `fontWeight` (custom fonts on Android ignore it). */
export const UI_FONTS = {
  regular: 'IBMPlexSansArabic-Regular',
  medium: 'IBMPlexSansArabic-Medium',
  semibold: 'IBMPlexSansArabic-SemiBold',
} as const;

export interface DhikrFont {
  id: string;
  family: string;
  /** Translation key of the font's display name (checked by a test). */
  nameKey: 'fonts.amiriQuran' | 'fonts.amiri' | 'fonts.scheherazade' | 'fonts.notoNaskh';
  /**
   * Line height as a multiple of the font size. Large enough that stacked
   * tashkeel (e.g. shadda + kasra) never touches the next line. Based on each
   * font's vertical metrics, then checked on a device at sizes 16 to 40.
   */
  lineHeight: number;
}

export const DHIKR_FONTS: readonly DhikrFont[] = [
  {
    id: 'amiri-quran',
    family: 'AmiriQuran-Regular',
    nameKey: 'fonts.amiriQuran',
    lineHeight: 2.45,
  },
  { id: 'amiri', family: 'Amiri-Regular', nameKey: 'fonts.amiri', lineHeight: 2.2 },
  {
    id: 'scheherazade',
    family: 'ScheherazadeNew-Regular',
    nameKey: 'fonts.scheherazade',
    lineHeight: 2.2,
  },
  {
    id: 'noto-naskh',
    family: 'NotoNaskhArabic-Regular',
    nameKey: 'fonts.notoNaskh',
    lineHeight: 2.0,
  },
];

/** Owner decision 2026-10-16. */
export const DEFAULT_DHIKR_FONT_ID = 'amiri-quran';

/** Bold display font for short headings (completion screen). */
export const DISPLAY_FONT = 'Amiri-Bold';

export function findDhikrFont(id: string): DhikrFont {
  return DHIKR_FONTS.find((f) => f.id === id) ?? DHIKR_FONTS[0]!;
}

export function isDhikrFontId(id: unknown): id is string {
  return typeof id === 'string' && DHIKR_FONTS.some((f) => f.id === id);
}

/** Line height in dp for a dhikr font at a size, rounded to a whole dp. */
export function dhikrLineHeight(fontId: string, size: number): number {
  return Math.round(size * findDhikrFont(fontId).lineHeight);
}

/** Every embedded font file, for the build config. */
export const FONT_FILES: readonly string[] = [
  './assets/fonts/ui/IBMPlexSansArabic-Regular.ttf',
  './assets/fonts/ui/IBMPlexSansArabic-Medium.ttf',
  './assets/fonts/ui/IBMPlexSansArabic-SemiBold.ttf',
  './assets/fonts/dhikr/AmiriQuran-Regular.ttf',
  './assets/fonts/dhikr/Amiri-Regular.ttf',
  './assets/fonts/dhikr/Amiri-Bold.ttf',
  './assets/fonts/dhikr/ScheherazadeNew-Regular.ttf',
  './assets/fonts/dhikr/NotoNaskhArabic-Regular.ttf',
];
