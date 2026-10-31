import i18n from './index';

/**
 * Arabic has six plural forms. On the phone they depend on the
 * intl-pluralrules polyfill (Hermes has no Intl.PluralRules).
 */
describe('Arabic plurals', () => {
  const count = (n: number) => i18n.t('home.adhkarCount', { count: n });

  it.each([
    [0, 'لا أذكار'],
    [1, 'ذكر واحد'],
    [2, 'ذكران'],
    [3, '3 أذكار'],
    [10, '10 أذكار'],
    [11, '11 ذكرًا'],
    [23, '23 ذكرًا'],
    [99, '99 ذكرًا'],
    [100, '100 ذكر'],
    [102, '102 ذكر'],
  ])('%i → %s', (n, expected) => {
    expect(count(n)).toBe(expected);
  });

  it('works when Intl.PluralRules is missing (as on Hermes)', () => {
    // A writable view of Intl, to simulate an engine without PluralRules.
    const intl = Intl as unknown as { PluralRules?: typeof Intl.PluralRules };
    const original = intl.PluralRules;
    jest.isolateModules(() => {
      delete intl.PluralRules;
      try {
        // require (not import): it must run inside isolateModules, after the delete.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('intl-pluralrules');
        expect(new Intl.PluralRules('ar').select(2)).toBe('two');
        expect(new Intl.PluralRules('ar').select(11)).toBe('many');
      } finally {
        intl.PluralRules = original;
      }
    });
  });
});
