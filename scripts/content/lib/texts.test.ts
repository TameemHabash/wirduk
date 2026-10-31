import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type TextsFile, validateTexts } from './texts';

const file = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', 'content-source', 'adwamuha-texts.json'), 'utf8'),
) as TextsFile;

describe("Adwamuha's texts in the content build", () => {
  it('the shipped file passes, and every text gets the language', () => {
    const texts = validateTexts(file, 'ar');
    expect(texts).toHaveLength(file.texts.length);
    expect(texts.every((t) => t.lang === 'ar')).toBe(true);
  });

  it('refuses unknown moments or states, a second text for a state, and missing texts', () => {
    const broken: TextsFile = {
      note: '',
      texts: [
        ...file.texts.filter((t) => t.id !== 'owner:extended'),
        { id: 'x1', moment: 'tip', state: 'stage:one', text: 'a', author: 'owner' },
        { id: 'x2', moment: 'tip', state: 'stage:1', text: 'b', author: 'owner' },
        { id: 'x3', moment: 'wardDone', state: 'later', text: 'c', author: 'owner' },
        { id: 'x4', moment: 'welcome', state: 'first:night', text: 'd', author: 'design' },
      ],
    };
    expect(() => validateTexts(broken, 'ar')).toThrow(
      /x1: unknown[\s\S]*x2: a second text for tip stage:1[\s\S]*x3: unknown[\s\S]*x4: unknown[\s\S]*no text for "extended"/,
    );
  });
});
