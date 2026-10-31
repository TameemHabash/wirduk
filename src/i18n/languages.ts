/**
 * Supported app languages.
 *
 * This module has no React Native imports on purpose: it is also read by
 * `app.config.ts` (at build time) and by the content build script.
 *
 * To add a language:
 *  1. Add it here.
 *  2. Add `src/i18n/locales/<code>/*.json`.
 *  3. Add its content translations to the content database.
 */

export type TextDirection = 'rtl' | 'ltr';

export interface LanguageInfo {
  /** BCP-47 code, also used as the `Lang` column in the database. */
  code: string;
  /** Name of the language in the language itself. */
  nativeName: string;
  dir: TextDirection;
}

export const LANGUAGES = {
  ar: { code: 'ar', nativeName: 'العربية', dir: 'rtl' },
} as const satisfies Record<string, LanguageInfo>;

export type LanguageCode = keyof typeof LANGUAGES;

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as LanguageCode[];

/** The app is Arabic-only for now; there is no language picker. */
export const DEFAULT_LANGUAGE: LanguageCode = 'ar';

export function isSupportedLanguage(code: string): code is LanguageCode {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, code);
}

export function directionOf(code: string): TextDirection {
  return isSupportedLanguage(code) ? LANGUAGES[code].dir : 'ltr';
}
