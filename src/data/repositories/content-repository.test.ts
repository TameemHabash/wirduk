import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createContentDb, openShippedContentDb } from '@/test-utils/databases';

import { ADWAMUHA_MOMENTS } from '../models';

import { addLineBreaks } from '../../../scripts/content/lib/line-breaks';
import { removeDoubleParens } from '../../../scripts/content/lib/quote-marks';

import { ContentRepository } from './content-repository';

describe('ContentRepository on the shipped content.db', () => {
  const db = openShippedContentDb();
  const repo = new ContentRepository(db);
  afterAll(() => db.close());

  it('lists 133 categories in the default order, morning then evening first', async () => {
    const cats = await repo.listCategories('ar');
    expect(cats).toHaveLength(133);
    expect(cats[0]).toMatchObject({
      id: 1,
      title: 'أذكار الصباح',
      defaultOrder: 1,
      adhkarCount: 24, // 23 from the book + the owner's opening dhikr
    });
    expect(cats[1]).toMatchObject({
      id: 133,
      title: 'أذكار المساء',
      defaultOrder: 2,
      adhkarCount: 22,
    });
    expect(cats.map((c) => c.defaultOrder)).toEqual(cats.map((_, i) => i + 1));
  });

  it('plays every recording a whole number of times: count ÷ times said per recording', async () => {
    let withAudio = 0;
    for (const category of await repo.listCategories('ar')) {
      for (const d of await repo.listAdhkar(category.id, 'ar')) {
        expect(Number.isInteger(d.audioRepeats) && d.audioRepeats >= 1).toBe(true);
        if (!d.audioFile) {
          expect(d.audioRepeats).toBe(1);
          continue;
        }
        withAudio++;
        if (d.count % d.audioRepeats !== 0) {
          throw new Error(
            `Dhikr ${d.id}: count ${d.count} is not a multiple of ${d.audioRepeats} (recording "${d.audioFile}")`,
          );
        }
      }
    }
    expect(withAudio).toBeGreaterThan(250);
  });

  it("has Adwamuha's approved messages: verses with their surah, hadiths with Dorar's data", async () => {
    const messages = await repo.listAdwamuhaMessages('ar');
    expect(messages).toHaveLength(63);
    const verse = messages.find((m) => m.id === 'q33-41-42')!;
    expect(verse).toMatchObject({
      kind: 'verse',
      moments: ['bothDone', 'newStep'],
      verse: { sura: 33, from: 41, to: 42 },
      hadith: null,
    });
    expect(verse.texts).toHaveLength(2);
    const hadith = messages.find((m) => m.id === 'd-FKL236hS')!;
    expect(hadith).toMatchObject({
      kind: 'hadith',
      verse: null,
      hadith: { book: 'صحيح البخاري', number: '6465', dorarUrl: 'https://dorar.net/h/FKL236hS' },
    });
    // Every moment has messages; another language falls back to Arabic.
    for (const moment of ADWAMUHA_MOMENTS) {
      expect(messages.some((m) => m.moments.includes(moment))).toBe(true);
    }
    expect(await repo.listAdwamuhaMessages('en')).toHaveLength(63);
  });

  it("has Adwamuha's own messages and tips, each with its moment and state", async () => {
    const texts = await repo.listAdwamuhaTexts('ar');
    for (const moment of ADWAMUHA_MOMENTS) {
      expect(texts.filter((t) => t.moment === moment && t.state === '')).toHaveLength(1);
    }
    expect(
      texts
        .filter((t) => t.moment === 'tip')
        .map((t) => t.state)
        .sort(),
    ).toEqual(['maintenance', 'stage:1', 'stage:2', 'stage:3', 'stage:4']);
    expect(
      texts
        .filter((t) => t.moment === 'welcome')
        .map((t) => t.state)
        .sort(),
    ).toEqual(['first:evening', 'first:morning', 'later:evening', 'later:morning']);
    expect(texts.every((t) => t.text.length > 0)).toBe(true);
    // Another language without its own texts gets the default language's.
    expect(await repo.listAdwamuhaTexts('en')).toEqual(texts);
  });

  it("has Adwamuha's default plan: 4 stages, the opening, 24 steps, every dhikr once", async () => {
    const plan = await repo.getDefaultPlan('ar');
    expect(plan.stages.map((s) => [s.stage, s.weeks])).toEqual([
      [1, 4],
      [2, 3],
      [3, 2],
      [4, 4],
    ]);
    expect(plan.stages.every((s) => s.title.length > 0)).toBe(true);
    expect(plan.steps).toHaveLength(25); // the opening (step 0) and steps 1–24
    expect(plan.steps[0]).toEqual({
      step: 0,
      stage: null,
      morningDhikrId: 1901,
      eveningDhikrId: 133901,
    });
    expect(plan.steps[23]).toMatchObject({
      step: 23,
      morningDhikrId: 1022,
      eveningDhikrId: 133022,
    });
    for (const [session, category] of [
      ['morningDhikrId', 1],
      ['eveningDhikrId', 133],
    ] as const) {
      const planned = plan.steps.map((s) => s[session]).filter((id) => id !== null);
      const all = (await repo.listAdhkar(category, 'ar')).map((d) => d.id);
      expect([...planned].sort()).toEqual([...all].sort());
    }
  });

  it('returns the adhkar of a category in order, with full tashkeel', async () => {
    const adhkar = await repo.listAdhkar(1, 'ar');
    expect(adhkar).toHaveLength(24);
    expect(adhkar.map((d) => d.order)).toEqual(adhkar.map((_, i) => i + 1));
    const read = (file: string) =>
      JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'content-source', file), 'utf8'));

    // First: the owner's own opening dhikr (not in the book), no audio, no source.
    const added = (read('overrides.json') as { addedAdhkar: { texts: { ar: string } }[] })
      .addedAdhkar[0]!;
    // The owner's own recordings (milestone 11), as recorded (m4a).
    expect(adhkar[0]).toMatchObject({ id: 1901, text: added.texts.ar, audioFile: '1901.m4a' });
    expect(adhkar[0]!.source).toBeNull();

    // Then the book, byte for byte without its (( )) marks and with each part on
    // its own line (typing Arabic marks by hand can change their order).
    const source = read('adhkar.json') as { id: number; array: { text: string }[] }[];
    expect(adhkar[1]!.text).toBe(
      addLineBreaks(removeDoubleParens(source[0]!.array[0]!.text.trim())),
    );
    expect(adhkar[1]!.text.split('\n')).toHaveLength(2); // isti'adha, then آية الكرسي
    expect(adhkar[1]!.audioFile).toBe('1001.m4a');
    // Quran recitation: the owner chose this Dorar narration; Dorar names no narrator.
    expect(adhkar[1]!.source).toMatchObject({
      source: 'مجموع فتاوى ابن باز (278/3)',
      dorarUrl: 'https://dorar.net/h/bboZbIJg',
    });
  });

  it('ships Dorar sources: source, grading, link and the approved fadl', async () => {
    const dorar = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', 'content-source', 'dorar-sources.json'),
        'utf8',
      ),
    ) as { entries: { dhikrIds: number[]; fadl?: { text: string } }[] };
    const fadl = dorar.entries.find((e) => e.dhikrIds.includes(1005))?.fadl?.text;
    expect(fadl).toBeTruthy();
    // اللهم أنت ربي… (سيد الاستغفار), morning and evening
    for (const id of [1005, 133005]) {
      const source = (await repo.getDhikr(id, 'ar'))?.source;
      expect(source).toMatchObject({
        source: 'صحيح البخاري (6306) — الراوي: شداد بن أوس',
        grading: 'صحيح — البخاري',
        fadl,
      });
      expect(source?.dorarUrl).toMatch(/^https:\/\/dorar\.net\/h\/\w+$/);
    }
  });

  it('ships no source where the owner decided so', async () => {
    expect((await repo.getDhikr(78001, 'ar'))?.source).toBeNull();
  });

  it('shows the evening words in the evening, and keeps the morning words in the morning', async () => {
    const morning = (await repo.getDhikr(1006, 'ar'))!.text;
    const evening = (await repo.getDhikr(133006, 'ar'))!.text;
    expect(evening).not.toBe(morning);
    expect(evening).not.toMatch(/وإذا أمسى/);
    // Only the opening changes; the rest is the same.
    const rest = morning.slice(morning.indexOf('،'));
    expect(evening.endsWith(rest)).toBe(true);
  });

  it('has the fixed counts', async () => {
    expect((await repo.getDhikr(1009, 'ar'))?.count).toBe(7);
    expect((await repo.getDhikr(133009, 'ar'))?.count).toBe(7);
    expect((await repo.getDhikr(37002, 'ar'))?.count).toBe(3);
  });

  it('returns null for unknown ids', async () => {
    expect(await repo.getCategory(99999, 'ar')).toBeNull();
    expect(await repo.getDhikr(99999, 'ar')).toBeNull();
    expect(await repo.listAdhkar(99999, 'ar')).toEqual([]);
  });

  describe('search', () => {
    it('finds adhkar without tashkeel in the query', async () => {
      const { adhkar } = await repo.search('سبحان الله وبحمده', 'ar');
      expect(adhkar.length).toBeGreaterThan(0);
      expect(adhkar.some((h) => h.dhikrId === 1017)).toBe(true);
    });

    it('matches the start of words (prefix search)', async () => {
      const { adhkar } = await repo.search('استغف', 'ar');
      expect(adhkar.length).toBeGreaterThan(0);
    });

    it('ignores hamza and taa marbuta differences', async () => {
      const a = await repo.search('الاسلام', 'ar');
      const b = await repo.search('الإسلام', 'ar');
      expect(a.adhkar.map((h) => h.dhikrId)).toEqual(b.adhkar.map((h) => h.dhikrId));
      expect(a.adhkar.length).toBeGreaterThan(0);
    });

    it('finds categories by title', async () => {
      const { categories } = await repo.search('النوم', 'ar');
      expect(categories.map((c) => c.categoryId)).toContain(2);
    });

    it('finds the cleaned and fixed titles', async () => {
      expect((await repo.search('المجلس', 'ar')).categories.map((c) => c.categoryId)).toEqual(
        expect.arrayContaining([84, 85]),
      );
      expect((await repo.search('منزلا', 'ar')).categories.map((c) => c.categoryId)).toEqual([104]);
    });

    it('requires every word to match', async () => {
      const { adhkar } = await repo.search('سبحان كلمةغيرموجودة', 'ar');
      expect(adhkar).toEqual([]);
    });

    it('returns nothing for empty or punctuation-only input', async () => {
      expect(await repo.search('', 'ar')).toEqual({ categories: [], adhkar: [] });
      expect(await repo.search(' ((*)) "', 'ar')).toEqual({ categories: [], adhkar: [] });
    });

    it('is safe with FTS syntax in the input', async () => {
      await expect(repo.search('سبحان" OR "*', 'ar')).resolves.toBeDefined();
      await expect(repo.search('NEAR(سبحان', 'ar')).resolves.toBeDefined();
    });

    it('respects the limit', async () => {
      const { adhkar } = await repo.search('الله', 'ar', 5);
      expect(adhkar).toHaveLength(5);
    });
  });

  it('lists the 273 audio files for Arabic, about 116 MB in total', async () => {
    const files = await repo.listAudioFiles('ar');
    expect(files).toHaveLength(273);
    const mb = files.reduce((sum, f) => sum + f.bytes, 0) / 1024 / 1024;
    expect(mb).toBeGreaterThan(110);
    expect(mb).toBeLessThan(120);
    expect(await repo.listAudioFiles('xx')).toEqual([]);
  });

  it("lists the morning and evening recordings: the owner's 30, about 12 MB", async () => {
    const files = await repo.listAudioFiles('ar', [1, 133]);
    expect(files).toHaveLength(30);
    expect(files.every((f) => f.fileName.endsWith('.m4a'))).toBe(true);
    const mb = files.reduce((sum, f) => sum + f.bytes, 0) / 1024 / 1024;
    expect(mb).toBeGreaterThan(11);
    expect(mb).toBeLessThan(14);
    // Most evening adhkar share the morning recordings; 7 have their own.
    expect((await repo.listAudioFiles('ar', [1])).length).toBe(23);
    expect(await repo.listAudioFiles('ar', [])).toEqual([]);
  });
});

describe('ContentRepository language fallback', () => {
  const db = createContentDb({
    categories: [
      { id: 1, sortOrder: 1, audioFile: null, titles: { ar: 'عربي', en: 'English' } },
      { id: 2, sortOrder: 2, audioFile: null, titles: { ar: 'فقط عربي' } },
    ],
    adhkar: [
      {
        id: 1001,
        categoryId: 1,
        sortOrder: 1,
        count: 1,
        audioFile: 'a',
        texts: { ar: 'نص', en: 'text' },
      },
      { id: 2001, categoryId: 2, sortOrder: 1, count: 1, audioFile: 'b', texts: { ar: 'نص ثان' } },
    ],
    audioFiles: [
      { lang: 'ar', fileName: 'a', bytes: 10, repeats: 1 },
      { lang: 'ar', fileName: 'b', bytes: 10, repeats: 1 },
      { lang: 'en', fileName: 'a', bytes: 10, repeats: 1 },
    ],
    changes: [],
    sources: [],
  });
  const repo = new ContentRepository(db, 'ar');
  afterAll(() => db.close());

  it('uses the requested language when it exists', async () => {
    expect((await repo.getCategory(1, 'en'))?.title).toBe('English');
    expect((await repo.getDhikr(1001, 'en'))?.text).toBe('text');
  });

  it('says how many times a recording says the dhikr (1 by default)', async () => {
    const repeated = createContentDb({
      categories: [{ id: 1, sortOrder: 1, audioFile: null, titles: { ar: 'عربي' } }],
      adhkar: [
        { id: 1001, categoryId: 1, sortOrder: 1, count: 100, audioFile: 'x', texts: { ar: 'أ' } },
        { id: 1002, categoryId: 1, sortOrder: 2, count: 3, audioFile: 'y', texts: { ar: 'ب' } },
        { id: 1003, categoryId: 1, sortOrder: 3, count: 1, audioFile: null, texts: { ar: 'ج' } },
      ],
      audioFiles: [
        { lang: 'ar', fileName: 'x', bytes: 10, repeats: 4 },
        { lang: 'ar', fileName: 'y', bytes: 10, repeats: 1 },
      ],
      changes: [],
      sources: [],
    });
    const r = new ContentRepository(repeated, 'ar');
    const list = await r.listAdhkar(1, 'ar');
    expect(list.map((d) => [d.id, d.audioRepeats])).toEqual([
      [1001, 4],
      [1002, 1],
      [1003, 1],
    ]);
    repeated.close();
  });

  it('falls back to the default language when a translation is missing', async () => {
    expect((await repo.getCategory(2, 'en'))?.title).toBe('فقط عربي');
    expect((await repo.getDhikr(2001, 'en'))?.text).toBe('نص ثان');
  });

  it('only offers audio that exists for the language', async () => {
    expect((await repo.getDhikr(1001, 'en'))?.audioFile).toBe('a');
    expect((await repo.getDhikr(2001, 'en'))?.audioFile).toBeNull();
    expect((await repo.getDhikr(2001, 'ar'))?.audioFile).toBe('b');
  });

  it('returns the source in the language of the shown text', async () => {
    db.raw.exec(`INSERT INTO DhikrSources (DhikrId, Lang, Fadl, Source, Grading, DorarUrl)
                 VALUES (2001, 'ar', NULL, 'مصدر', 'صحيح', 'https://dorar.net/h/x')`);
    const d = await repo.getDhikr(2001, 'en'); // text falls back to Arabic
    expect(d?.source).toEqual({
      fadl: null,
      source: 'مصدر',
      grading: 'صحيح',
      dorarUrl: 'https://dorar.net/h/x',
    });
  });
});
