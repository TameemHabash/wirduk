import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './languages';
import { resources } from './resources';

/** Flattens nested translation objects into dotted keys. */
function flatten(obj: object, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') Object.assign(out, flatten(value, path));
    else out[path] = value;
  }
  return out;
}

describe('translation resources', () => {
  const reference = flatten(resources[DEFAULT_LANGUAGE]);

  it('has resources for every supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(resources).toHaveProperty(lang);
    }
  });

  it.each(SUPPORTED_LANGUAGES)('%s has every key of the default language', (lang) => {
    const keys = Object.keys(flatten(resources[lang]));
    expect(keys.sort()).toEqual(Object.keys(reference).sort());
  });

  it.each(SUPPORTED_LANGUAGES)('%s has no empty strings', (lang) => {
    for (const [key, value] of Object.entries(flatten(resources[lang]))) {
      expect({ key, ok: typeof value === 'string' && value.trim().length > 0 }).toEqual({
        key,
        ok: true,
      });
    }
  });
});
