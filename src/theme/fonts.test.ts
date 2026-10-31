import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { resources } from '@/i18n/resources';

import {
  DEFAULT_DHIKR_FONT_ID,
  DHIKR_FONTS,
  DISPLAY_FONT,
  FONT_FILES,
  UI_FONTS,
  dhikrLineHeight,
  findDhikrFont,
  isDhikrFontId,
} from './fonts';

const root = join(__dirname, '..', '..');
const familyOf = (file: string) =>
  file
    .split('/')
    .pop()!
    .replace(/\.ttf$/, '');

describe('font registry', () => {
  it('has every font file on disk, each with an OFL license next to it', () => {
    for (const file of FONT_FILES) {
      expect({ file, exists: existsSync(join(root, file)) }).toEqual({ file, exists: true });
    }
    // License file per family, e.g. OFL-AmiriQuran.txt next to AmiriQuran-Regular.ttf.
    for (const file of FONT_FILES) {
      const family = familyOf(file).split('-')[0]!;
      const dir = join(root, file, '..');
      const license = readdirSync(dir).find((f) => f === `OFL-${family}.txt`);
      expect({ family, license }).toEqual({ family, license: `OFL-${family}.txt` });
    }
  });

  it('only uses families that are embedded', () => {
    const embedded = new Set(FONT_FILES.map(familyOf));
    for (const family of [
      ...Object.values(UI_FONTS),
      DISPLAY_FONT,
      ...DHIKR_FONTS.map((f) => f.family),
    ]) {
      expect({ family, embedded: embedded.has(family) }).toEqual({ family, embedded: true });
    }
  });

  it('has unique ids and a valid default (Amiri Quran)', () => {
    const ids = DHIKR_FONTS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_DHIKR_FONT_ID).toBe('amiri-quran');
    expect(isDhikrFontId(DEFAULT_DHIKR_FONT_ID)).toBe(true);
  });

  it('does not ship KFGQPC (license needs written approval)', () => {
    expect(FONT_FILES.some((f) => /kfgqpc|uthman/i.test(f))).toBe(false);
  });

  it('has a translated name for every dhikr font', () => {
    const fonts = resources.ar.common.fonts as Record<string, string>;
    for (const f of DHIKR_FONTS) {
      expect(fonts[f.nameKey.replace('fonts.', '')]).toBeTruthy();
    }
  });

  it('falls back to the first font for an unknown id', () => {
    expect(findDhikrFont('nope')).toBe(DHIKR_FONTS[0]);
  });

  it('gives tall line heights for tashkeel, rounded to whole dp', () => {
    for (const f of DHIKR_FONTS) {
      expect(f.lineHeight).toBeGreaterThanOrEqual(2);
      for (const size of [16, 24, 40]) {
        const lh = dhikrLineHeight(f.id, size);
        expect(Number.isInteger(lh)).toBe(true);
        expect(lh).toBeGreaterThanOrEqual(size * 2);
      }
    }
  });
});
