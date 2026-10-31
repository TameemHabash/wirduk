import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { addLineBreaks } from './line-breaks';
import { removeDoubleParens } from './quote-marks';
import { contextSnippet, makeDhikrId, transformContent, validateSource } from './transform';
import type { AudioManifest, DorarSources, Overrides, SourceCategory } from './types';

const noOverrides: Overrides = { categorySplits: [], countFixes: [], textFixes: [] };

function manifestFor(...files: string[]): AudioManifest {
  return { lang: 'ar', files: files.map((file) => ({ file, bytes: 100, sha256: 'x' })) };
}

function fixture(): SourceCategory[] {
  return [
    {
      id: 1,
      category: 'أذكار الصباح والمساء',
      audio: '/audio/c1.mp3',
      filename: 'c1',
      array: [
        { id: 1, text: 'سُبْحَانَ اللَّهِ', count: 3, audio: '/audio/a.mp3', filename: 'a' },
        {
          id: 2,
          text: '((أَصْبَحْنَا)). [وإذا أمسى قال: أمسينا]',
          count: 1,
          audio: '/audio/b.mp3',
          filename: 'b',
        },
        { id: 3, text: 'نص المساء (إذا أمسى)', count: 1, audio: '/audio/c.mp3', filename: 'c' },
      ],
    },
    {
      id: 2,
      // U+FE97 U+FEEC: PDF letter-shape forms of "ته", as in the real source title 47.
      category: `${String.fromCodePoint(0xfe97, 0xfeec)}نئة المولود`,
      audio: '/audio/c2.mp3',
      filename: 'c2',
      array: [{ id: 1, text: 'بَارَكَ اللَّهُ لَكَ  ', count: 1, audio: '', filename: '' }],
    },
  ];
}

const splitOverrides: Overrides = {
  ...noOverrides,
  categorySplits: [
    {
      sourceCategoryId: 1,
      reason: 'test',
      parts: [
        {
          id: 1,
          titles: { ar: 'الصباح' },
          excludeDhikr: [3],
          removePatterns: ['\\[\\s*وإذا أمسى[^\\]]*\\]'],
        },
        { id: 99, titles: { ar: 'المساء' }, excludeDhikr: [], removePatterns: [] },
      ],
    },
  ],
};

describe('makeDhikrId', () => {
  it('builds a stable global id', () => {
    expect(makeDhikrId(1, 1)).toBe(1001);
    expect(makeDhikrId(133, 24)).toBe(133024);
  });

  it('rejects positions that would collide', () => {
    expect(() => makeDhikrId(1, 0)).toThrow();
    expect(() => makeDhikrId(1, 1000)).toThrow();
  });
});

describe('contextSnippet', () => {
  const text = 'one two three four five six seven eight nine ten';

  it('shows whole words around the change, with ellipses when cut', () => {
    const at = text.indexOf('five');
    // 6 characters on each side: the left cut lands on a space, the right one inside "seven".
    expect(contextSnippet(text, at, 4, 6)).toBe('…four five six seven…');
  });

  it('has no ellipsis at the start or the end of the text', () => {
    expect(contextSnippet(text, 0, 3, 3)).toBe('one two…');
    expect(contextSnippet(text, text.indexOf('ten'), 3, 3)).toBe('…nine ten');
  });
});

describe('validateSource', () => {
  it('rejects duplicate dhikr ids', () => {
    const src = fixture();
    src[0]!.array[1]!.id = 1;
    expect(() => validateSource(src)).toThrow(/Duplicate dhikr id/);
  });

  it('rejects a bad count', () => {
    const src = fixture();
    src[0]!.array[0]!.count = 0;
    expect(() => validateSource(src)).toThrow(/Bad count/);
  });
});

describe('transformContent', () => {
  it('keeps text and tashkeel unchanged when there are no overrides', () => {
    const model = transformContent(fixture(), noOverrides, manifestFor('a', 'b', 'c'));
    expect(model.adhkar.find((d) => d.id === 1001)?.texts.ar).toBe('سُبْحَانَ اللَّهِ');
  });

  it('does not mutate the source', () => {
    const src = fixture();
    const before = JSON.stringify(src);
    transformContent(src, { ...splitOverrides, countFixes: [] }, manifestFor('a', 'b', 'c'));
    expect(JSON.stringify(src)).toBe(before);
  });

  it('cleans PDF letter-shape characters and logs it', () => {
    const model = transformContent(fixture(), noOverrides, manifestFor('a', 'b', 'c'));
    expect(model.categories.find((c) => c.id === 2)?.titles.ar).toBe('تهنئة المولود');
    expect(model.changes.some((c) => c.kind === 'cleanup' && c.where === 'category 2 title')).toBe(
      true,
    );
  });

  it('trims surrounding whitespace', () => {
    const model = transformContent(fixture(), noOverrides, manifestFor('a', 'b', 'c'));
    expect(model.adhkar.find((d) => d.id === 2001)?.texts.ar).toBe('بَارَكَ اللَّهُ لَكَ');
  });

  it('splits a category into independent parts', () => {
    const model = transformContent(fixture(), splitOverrides, manifestFor('a', 'b', 'c'));
    expect(model.categories.map((c) => [c.id, c.titles.ar, c.sortOrder])).toEqual([
      [1, 'الصباح', 1],
      [99, 'المساء', 2],
      [2, 'تهنئة المولود', 3],
    ]);
    expect(model.adhkar.filter((d) => d.categoryId === 1).map((d) => d.id)).toEqual([1001, 1002]);
    expect(model.adhkar.filter((d) => d.categoryId === 99).map((d) => d.id)).toEqual([
      99001, 99002, 99003,
    ]);
  });

  it('removes only the matched notes from one part, and keeps them in the other', () => {
    const model = transformContent(fixture(), splitOverrides, manifestFor('a', 'b', 'c'));
    expect(model.adhkar.find((d) => d.id === 1002)?.texts.ar).toBe('((أَصْبَحْنَا)).');
    expect(model.adhkar.find((d) => d.id === 99002)?.texts.ar).toBe(
      '((أَصْبَحْنَا)). [وإذا أمسى قال: أمسينا]',
    );
  });

  it('applies a part text fix to that part only, before its notes are removed', () => {
    const fixed: Overrides = {
      ...splitOverrides,
      categorySplits: [
        {
          ...splitOverrides.categorySplits[0]!,
          parts: [
            splitOverrides.categorySplits[0]!.parts[0]!,
            {
              id: 99,
              titles: { ar: 'المساء' },
              excludeDhikr: [],
              textFixes: [
                {
                  dhikrId: 2,
                  find: 'أَصْبَحْنَا',
                  replace: 'أَمْسَيْنَا',
                  reason: 'r',
                  evidence: 'e',
                },
              ],
              removePatterns: ['\\[\\s*وإذا أمسى[^\\]]*\\]'],
            },
          ],
        },
      ],
    };
    const model = transformContent(fixture(), fixed, manifestFor('a', 'b', 'c'));
    expect(model.adhkar.find((d) => d.id === 1002)?.texts.ar).toBe('((أَصْبَحْنَا)).');
    expect(model.adhkar.find((d) => d.id === 99002)?.texts.ar).toBe('((أَمْسَيْنَا)).');
    expect(model.changes.some((c) => c.kind === 'text' && c.where === '1:2 in category 99')).toBe(
      true,
    );

    const withFix = (fix: { dhikrId: number; find: string }): Overrides => ({
      ...fixed,
      categorySplits: [
        {
          ...fixed.categorySplits[0]!,
          parts: [
            { ...fixed.categorySplits[0]!.parts[0]!, excludeDhikr: [3] },
            {
              ...fixed.categorySplits[0]!.parts[1]!,
              excludeDhikr: [1],
              textFixes: [{ ...fix, replace: 'x', reason: 'r', evidence: 'e' }],
            },
          ],
        },
      ],
    });
    const run = (o: Overrides) => () => transformContent(fixture(), o, manifestFor('a', 'b', 'c'));
    expect(run(withFix({ dhikrId: 2, find: 'غير موجود' }))).toThrow(/not found/);
    expect(run(withFix({ dhikrId: 9, find: 'x' }))).toThrow(/missing dhikr 1:9/);
    expect(run(withFix({ dhikrId: 1, find: 'x' }))).toThrow(/excluded dhikr 1:1/);
  });

  it('numbers adhkar inside each category from 1', () => {
    const model = transformContent(fixture(), splitOverrides, manifestFor('a', 'b', 'c'));
    expect(model.adhkar.filter((d) => d.categoryId === 99).map((d) => d.sortOrder)).toEqual([
      1, 2, 3,
    ]);
  });

  it('applies a count fix only when the source still has the expected value', () => {
    const ok = transformContent(
      fixture(),
      { ...noOverrides, countFixes: [{ categoryId: 1, dhikrId: 1, from: 3, to: 7, reason: 'r' }] },
      manifestFor('a', 'b', 'c'),
    );
    expect(ok.adhkar.find((d) => d.id === 1001)?.count).toBe(7);

    expect(() =>
      transformContent(
        fixture(),
        {
          ...noOverrides,
          countFixes: [{ categoryId: 1, dhikrId: 1, from: 1, to: 7, reason: 'r' }],
        },
        manifestFor('a', 'b', 'c'),
      ),
    ).toThrow(/expects 1 but the source has 3/);
  });

  it('applies a text fix exactly once, and fails when the text is not found', () => {
    const fix = {
      target: 'text' as const,
      categoryId: 1,
      dhikrId: 1,
      find: 'سُبْحَانَ',
      replace: 'سُبْحَانَكَ',
      reason: 'r',
      evidence: 'https://dorar.net/x',
    };
    const ok = transformContent(
      fixture(),
      { ...noOverrides, textFixes: [fix] },
      manifestFor('a', 'b', 'c'),
    );
    expect(ok.adhkar.find((d) => d.id === 1001)?.texts.ar).toBe('سُبْحَانَكَ اللَّهِ');

    expect(() =>
      transformContent(
        fixture(),
        { ...noOverrides, textFixes: [{ ...fix, find: 'غير موجود' }] },
        manifestFor('a', 'b', 'c'),
      ),
    ).toThrow(/not found/);
  });

  it('fails when an audio file is not in the manifest', () => {
    expect(() => transformContent(fixture(), noOverrides, manifestFor('a', 'b'))).toThrow(
      /"c".*not in the manifest/,
    );
  });

  it('stores no audio for adhkar without a file name', () => {
    const model = transformContent(fixture(), noOverrides, manifestFor('a', 'b', 'c'));
    expect(model.adhkar.find((d) => d.id === 2001)?.audioFile).toBeNull();
  });

  it('lists each used audio file once', () => {
    const model = transformContent(fixture(), splitOverrides, manifestFor('a', 'b', 'c', 'unused'));
    expect(model.audioFiles.map((f) => f.fileName)).toEqual(['a', 'b', 'c']);
  });

  describe('audio repeats (times the dhikr is said in one recording)', () => {
    const withRepeats = (files: Record<string, number>): Overrides => ({
      ...splitOverrides,
      audioRepeats: { reason: 'owner test', files },
    });
    const build = (files: Record<string, number>) =>
      transformContent(fixture(), withRepeats(files), manifestFor('a', 'b', 'c'));

    it('is 1 for every recording unless listed', () => {
      const model = transformContent(fixture(), splitOverrides, manifestFor('a', 'b', 'c'));
      expect(model.audioFiles.map((f) => f.repeats)).toEqual([1, 1, 1]);
    });

    it('stores the listed number and logs which adhkar use it', () => {
      // "a" is سُبْحَانَ اللَّهِ, count 3, in the morning (1001) and the evening (99001).
      const model = build({ a: 3 });
      expect(model.audioFiles.find((f) => f.fileName === 'a')?.repeats).toBe(3);
      expect(model.audioFiles.find((f) => f.fileName === 'b')?.repeats).toBe(1);
      const logged = model.changes.filter((c) => c.kind === 'audio-repeats');
      expect(logged).toEqual([
        {
          kind: 'audio-repeats',
          where: '1001, 99001',
          detail:
            'Recording "a" says the dhikr 3 times: it plays 1× for count 3, 1× for count 3. owner test',
        },
      ]);
    });

    it('logs nothing for a recording listed as 1', () => {
      const model = build({ a: 1 });
      expect(model.changes.some((c) => c.kind === 'audio-repeats')).toBe(false);
    });

    it('fails when a count does not divide evenly', () => {
      expect(() => build({ a: 2 })).toThrow(/dhikr 1001 has count 3.*"a".*said 2 times/);
    });

    it('fails for a number that is not a whole number of 1 or more', () => {
      expect(() => build({ a: 0 })).toThrow(/whole number/);
      expect(() => build({ a: 1.5 })).toThrow(/whole number/);
    });

    it('fails for a recording no dhikr uses', () => {
      expect(() => build({ zzz: 2 })).toThrow(/no dhikr uses the recording "zzz"/);
    });
  });

  describe("the owner's recordings (milestone 11)", () => {
    const withRecordings = (adhkar: Record<string, string>, files: Record<string, number> = {}) =>
      transformContent(
        fixture(),
        {
          ...splitOverrides,
          audioRepeats: { reason: 'owner test', files },
          audioRecordings: { reason: 'owner test', sheet: 'sheet.csv', adhkar },
        },
        manifestFor('a', 'b', 'c', '1001.m4a'),
      );

    it('plays the new file in place of the book’s, and leaves out a book file no one plays', () => {
      // "a" is used by 1001 (morning) and 99001 (evening): both move to the new file.
      const model = withRecordings({ 1001: '1001.m4a', 99001: '1001.m4a' }, { '1001.m4a': 3 });
      expect(model.adhkar.find((d) => d.id === 1001)?.audioFile).toBe('1001.m4a');
      expect(model.audioFiles.map((f) => f.fileName)).toEqual(['1001.m4a', 'b', 'c']);
      expect(model.audioFiles.find((f) => f.fileName === '1001.m4a')?.repeats).toBe(3);
      expect(model.changes.filter((c) => c.kind === 'audio-recordings')).toEqual([
        {
          kind: 'audio-recordings',
          where: '1001, 99001',
          detail: `Plays the owner's recording "1001.m4a". owner test (sheet.csv)`,
        },
      ]);
    });

    it('keeps a book file another dhikr still plays', () => {
      const model = withRecordings({ 1001: '1001.m4a' });
      expect(model.audioFiles.map((f) => f.fileName)).toContain('a'); // 99001 still plays it
    });

    it('fails for a dhikr that does not exist, or a file not in the manifest', () => {
      expect(() => withRecordings({ 5: '1001.m4a' })).toThrow(/no dhikr 5/);
      expect(() => withRecordings({ 1001: 'x.m4a' })).toThrow(/"x.m4a".*not in the manifest/);
    });
  });

  it('rejects a split part id that collides with another category', () => {
    const bad: Overrides = {
      ...splitOverrides,
      categorySplits: [
        {
          ...splitOverrides.categorySplits[0]!,
          parts: [
            { id: 1, titles: { ar: 'أ' }, excludeDhikr: [], removePatterns: [] },
            { id: 2, titles: { ar: 'ب' }, excludeDhikr: [], removePatterns: [] },
          ],
        },
      ],
    };
    expect(() => transformContent(fixture(), bad, manifestFor('a', 'b', 'c'))).toThrow(
      /Duplicate category id/,
    );
  });
});

/** Checks on the real source data and our real overrides. */
describe('real content', () => {
  const root = join(__dirname, '..', '..', '..', 'content-source');
  const read = <T>(f: string): T => JSON.parse(readFileSync(join(root, f), 'utf8')) as T;
  const source = read<SourceCategory[]>('adhkar.json');
  const model = transformContent(
    source,
    read<Overrides>('overrides.json'),
    read<AudioManifest>('audio-manifest.json'),
  );
  const inCat = (id: number) => model.adhkar.filter((d) => d.categoryId === id);
  /** The owner's own adhkar use positions 900+ (see AddedDhikr). */
  const isAdded = (id: number) => id % 1000 >= 900;
  /** The book's text as shown: no (( )), each part of a long dhikr on its own line. */
  const stepLists = read<Overrides>('overrides.json').lineBreaks!.stepListIds;
  const display = (text: string, id: number) =>
    addLineBreaks(removeDoubleParens(text), { stepList: stepLists.includes(id) });

  it('puts each part of a long dhikr on its own line', () => {
    const lines = (id: number) => model.adhkar.find((a) => a.id === id)!.texts.ar!.split('\n');
    expect(lines(1002)).toHaveLength(3); // three surahs
    expect(lines(133002)).toHaveLength(3);
    expect(lines(1001)).toHaveLength(2); // isti'adha, then the verse
    expect(lines(2001)).toHaveLength(5); // intro, three surahs, then the next step
    expect(lines(31001)).toHaveLength(4); // four steps
    expect(lines(28001)).toHaveLength(1); // its dashes are side notes
  });
  const fromBook = (id: number) => inCat(id).filter((d) => !isAdded(d.id));

  it("starts morning and evening with the owner's own dhikr, in the owner's words", () => {
    const added = read<Overrides>('overrides.json').addedAdhkar![0]!;
    for (const categoryId of [1, 133]) {
      const first = inCat(categoryId)[0]!;
      expect(first).toMatchObject({
        id: makeDhikrId(categoryId, 901),
        sortOrder: 1,
        count: 1,
        // The owner's recording (milestone 11).
        audioFile: '1901.m4a',
      });
      expect(first.texts.ar).toBe(added.texts.ar);
      expect(inCat(categoryId).map((d) => d.sortOrder)).toEqual(
        inCat(categoryId).map((_, i) => i + 1),
      );
    }
    expect(model.changes.filter((c) => c.kind === 'added')).toHaveLength(2);
  });

  it('shows no (( )) quote marks', () => {
    for (const d of model.adhkar) {
      expect({ id: d.id, marks: /\(\(/.test(d.texts.ar!) }).toEqual({ id: d.id, marks: false });
    }
  });

  it('has morning and evening as separate categories, next to each other', () => {
    const morning = model.categories.find((c) => c.id === 1);
    const evening = model.categories.find((c) => c.id === 133);
    expect(morning?.titles.ar).toBe('أذكار الصباح');
    expect(evening?.titles.ar).toBe('أذكار المساء');
    expect(morning?.sortOrder).toBe(1);
    expect(evening?.sortOrder).toBe(2);
  });

  it('keeps morning-only adhkar out of the evening, and evening-only out of the morning', () => {
    expect(fromBook(1)).toHaveLength(23);
    expect(fromBook(133)).toHaveLength(21);
    expect(inCat(1).some((d) => d.id === 1023)).toBe(false);
    expect(inCat(133).some((d) => [133019, 133020, 133021].includes(d.id))).toBe(false);
  });

  it('has no evening notes in the morning text', () => {
    for (const d of inCat(1)) expect(d.texts.ar).not.toMatch(/وإذا أمسى/);
  });

  it('only shortens morning texts (never adds words)', () => {
    const src = source.find((c) => c.id === 1)!;
    for (const d of fromBook(1)) {
      const original = src.array.find((s) => makeDhikrId(1, s.id) === d.id)!.text;
      expect(display(original, d.id).startsWith(d.texts.ar!)).toBe(true);
    }
  });

  it('keeps every other dhikr text identical to the source (apart from trimming)', () => {
    const fixed = new Set(
      read<Overrides>('overrides.json')
        .textFixes.filter((f) => f.target === 'text')
        .map((f) => `${f.categoryId}:${f.dhikrId}`),
    );
    for (const cat of source) {
      if (cat.id === 1) continue;
      for (const s of cat.array) {
        if (fixed.has(`${cat.id}:${s.id}`)) continue;
        const d = model.adhkar.find((a) => a.id === makeDhikrId(cat.id, s.id));
        expect(d?.texts.ar).toBe(display(s.text.trim(), d!.id));
      }
    }
  });

  it('changes approved text fixes by exactly the fixed characters', () => {
    for (const fix of read<Overrides>('overrides.json').textFixes) {
      if (fix.target !== 'text') continue;
      const original = source
        .find((c) => c.id === fix.categoryId)!
        .array.find((s) => s.id === fix.dhikrId)!.text;
      const d = model.adhkar.find((a) => a.id === makeDhikrId(fix.categoryId, fix.dhikrId!));
      expect(d?.texts.ar).toBe(display(original.replace(fix.find, fix.replace).trim(), d!.id));
    }
  });

  it('has a positive count for every dhikr, and an audio file for every one from the book', () => {
    for (const d of model.adhkar) {
      expect(d.count).toBeGreaterThanOrEqual(1);
      if (!isAdded(d.id)) expect(d.audioFile).toBeTruthy();
    }
  });

  it('has no lone tashkeel mark at the start of a word (PDF glitch)', () => {
    // U+064B–U+065F, U+0670 right after a space or at the start.
    const loneMark = new RegExp(
      `(^|\\s)[${String.fromCodePoint(0x064b)}-${String.fromCodePoint(0x065f)}${String.fromCodePoint(0x0670)}]`,
    );
    for (const c of model.categories)
      expect({ id: c.id, bad: loneMark.test(c.titles.ar!) }).toEqual({ id: c.id, bad: false });
    for (const d of model.adhkar)
      expect({ id: d.id, bad: loneMark.test(d.texts.ar!) }).toEqual({ id: d.id, bad: false });
  });

  it('has no "مترلا" (PDF glitch for منزلا)', () => {
    expect(model.categories.some((c) => c.titles.ar!.includes('مترلا'))).toBe(false);
    expect(model.categories.find((c) => c.id === 104)?.titles.ar).toBe(
      'الدعاء إذا نزل منزلا في سفر أو غيره',
    );
  });

  it("has 133 categories and 289 adhkar (287 from the book + 2 copies of the owner's)", () => {
    expect(model.categories).toHaveLength(133);
    expect(model.adhkar).toHaveLength(289);
  });

  describe('with the Dorar sources (as shipped)', () => {
    const shipped = transformContent(
      source,
      read<Overrides>('overrides.json'),
      read<AudioManifest>('audio-manifest.json'),
      read<DorarSources>('dorar-sources.json'),
    );
    const text = (id: number) => shipped.adhkar.find((a) => a.id === id)!.texts.ar!;
    // Source dhikr in category 1 whose evening words differ (owner decision 2026-10-17).
    const EVENING_WORDS = [3, 4, 6, 7, 15, 16];

    it('has no evening notes left in the evening text', () => {
      for (const d of shipped.adhkar.filter((a) => a.categoryId === 133)) {
        expect({ id: d.id, notes: /وإذا أمسى/.test(d.texts.ar!) }).toEqual({
          id: d.id,
          notes: false,
        });
      }
    });

    it('changes only the evening words: the morning keeps the book text', () => {
      for (const s of source.find((c) => c.id === 1)!.array) {
        if (s.id === 23) continue; // evening only
        const morning = text(makeDhikrId(1, s.id));
        expect(model.adhkar.find((a) => a.id === makeDhikrId(1, s.id))!.texts.ar).toBe(morning);
        if (s.id >= 19 && s.id <= 21) continue; // morning only
        const evening = text(makeDhikrId(133, s.id));
        if (EVENING_WORDS.includes(s.id)) expect(evening).not.toBe(morning);
        else expect(evening).toBe(morning);
      }
    });

    it('logs every approved Dorar wording', () => {
      const approved = (read<DorarSources>('dorar-sources.json').wordingProposals ?? []).filter(
        (p) => p.approved,
      );
      expect(shipped.changes.filter((c) => c.kind === 'wording')).toHaveLength(approved.length);
      for (const p of approved) expect(text(p.dhikrId)).toContain(p.proposed);
    });
  });
});
