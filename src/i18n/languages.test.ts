import { DEFAULT_LANGUAGE, LANGUAGES, directionOf, isSupportedLanguage } from './languages';

describe('languages', () => {
  it('uses Arabic as the default language', () => {
    expect(DEFAULT_LANGUAGE).toBe('ar');
  });

  it('derives the direction from the language', () => {
    expect(directionOf('ar')).toBe('rtl');
  });

  it('falls back to LTR for unknown languages', () => {
    expect(directionOf('xx')).toBe('ltr');
  });

  it('knows which languages are supported', () => {
    expect(isSupportedLanguage('ar')).toBe(true);
    expect(isSupportedLanguage('toString')).toBe(false);
    expect(isSupportedLanguage('')).toBe(false);
  });

  it('keeps code keys and code fields in sync', () => {
    for (const [key, info] of Object.entries(LANGUAGES)) {
      expect(info.code).toBe(key);
    }
  });
});
