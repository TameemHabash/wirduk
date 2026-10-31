import { createUserDb } from '@/test-utils/databases';

import { CUSTOM_LIMITS, CustomContentError, CustomRepository } from './custom-repository';

function fakeClock(start = 1_000) {
  let t = start;
  return () => t++;
}

async function repo() {
  return new CustomRepository(await createUserDb(), fakeClock());
}

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return 'no error';
  } catch (e) {
    return e instanceof CustomContentError ? e.code : String(e);
  }
};

describe('CustomRepository — categories', () => {
  it('creates categories with negative ids, in order, marked custom', async () => {
    const r = await repo();
    const a = await r.createCategory('  أذكاري اليومية  ');
    const b = await r.createCategory('أدعية السفر');
    expect(a).toEqual({
      id: -1,
      title: 'أذكاري اليومية',
      defaultOrder: 1,
      adhkarCount: 0,
      custom: true,
    });
    expect(b.id).toBe(-2);
    expect((await r.listCategories()).map((c) => c.title)).toEqual([
      'أذكاري اليومية',
      'أدعية السفر',
    ]);
  });

  it('validates the title', async () => {
    const r = await repo();
    expect(await codeOf(r.createCategory('   '))).toBe('emptyTitle');
    expect(await codeOf(r.createCategory('أ'.repeat(CUSTOM_LIMITS.titleMax + 1)))).toBe(
      'titleTooLong',
    );
  });

  it('renames, reorders and deletes', async () => {
    const r = await repo();
    const a = await r.createCategory('أ');
    const b = await r.createCategory('ب');
    await r.renameCategory(a.id, 'ألف');
    await r.reorderCategories([b.id, a.id]);
    expect((await r.listCategories()).map((c) => c.title)).toEqual(['ب', 'ألف']);
    await r.deleteCategory(b.id);
    expect((await r.listCategories()).map((c) => c.id)).toEqual([a.id]);
    expect(await codeOf(r.renameCategory(b.id, 'x'))).toBe('notFound');
  });

  it('never accepts content (positive) ids', async () => {
    const r = await repo();
    expect(await r.getCategory(1)).toBeNull();
    expect(await r.listAdhkar(1)).toEqual([]);
    expect(await codeOf(r.renameCategory(1, 'x'))).toBe('notFound');
  });
});

describe('CustomRepository — adhkar', () => {
  it('creates a dhikr with every field, keeping tashkeel exactly', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const text = 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ';
    const d = await r.createDhikr(cat.id, {
      text: `  ${text}  `,
      count: 33,
      fadl: '  فضل كتبته  ',
      source: 'مصدري',
      audioFile: 'rec-1.m4a',
    });
    expect(d).toEqual({
      id: -1,
      categoryId: cat.id,
      order: 1,
      count: 33,
      text,
      audioFile: 'rec-1.m4a',
      audioRepeats: 1, // the user's own recording says it once
      source: { fadl: 'فضل كتبته', source: 'مصدري', grading: null, dorarUrl: null },
      custom: true,
    });
    expect((await r.getCategory(cat.id))?.adhkarCount).toBe(1);
  });

  it('stores empty notes as no source', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const d = await r.createDhikr(cat.id, { text: 'نص', count: 1, fadl: '   ', source: '' });
    expect(d.source).toBeNull();
    expect(d.audioFile).toBeNull();
  });

  it('validates text, count and notes', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const add = (input: Parameters<CustomRepository['createDhikr']>[1]) =>
      r.createDhikr(cat.id, input);
    expect(await codeOf(add({ text: ' ', count: 1 }))).toBe('emptyText');
    expect(await codeOf(add({ text: 'ن'.repeat(CUSTOM_LIMITS.textMax + 1), count: 1 }))).toBe(
      'textTooLong',
    );
    expect(await codeOf(add({ text: 'نص', count: 0 }))).toBe('badCount');
    expect(await codeOf(add({ text: 'نص', count: 2.5 }))).toBe('badCount');
    expect(await codeOf(add({ text: 'نص', count: CUSTOM_LIMITS.countMax + 1 }))).toBe('badCount');
    expect(
      await codeOf(add({ text: 'نص', count: 1, fadl: 'ف'.repeat(CUSTOM_LIMITS.noteMax + 1) })),
    ).toBe('noteTooLong');
    expect(await codeOf(r.createDhikr(-99, { text: 'نص', count: 1 }))).toBe('notFound');
  });

  it('updates a dhikr and reports a replaced audio file', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const d = await r.createDhikr(cat.id, { text: 'قديم', count: 1, audioFile: 'old.m4a' });
    const same = await r.updateDhikr(d.id, { text: 'جديد', count: 3, audioFile: 'old.m4a' });
    expect(same.oldAudioFile).toBeNull();
    expect(same.dhikr).toMatchObject({ text: 'جديد', count: 3 });
    const replaced = await r.updateDhikr(d.id, { text: 'جديد', count: 3, audioFile: 'new.m4a' });
    expect(replaced.oldAudioFile).toBe('old.m4a');
    const removed = await r.updateDhikr(d.id, { text: 'جديد', count: 3, audioFile: null });
    expect(removed.oldAudioFile).toBe('new.m4a');
  });

  it('orders adhkar inside a category and reorders them', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const a = await r.createDhikr(cat.id, { text: 'أ', count: 1 });
    const b = await r.createDhikr(cat.id, { text: 'ب', count: 1 });
    const c = await r.createDhikr(cat.id, { text: 'ج', count: 1 });
    expect((await r.listAdhkar(cat.id)).map((d) => d.order)).toEqual([1, 2, 3]);
    await r.reorderAdhkar(cat.id, [c.id, a.id, b.id]);
    expect((await r.listAdhkar(cat.id)).map((d) => d.text)).toEqual(['ج', 'أ', 'ب']);
  });

  it('deletes a dhikr and returns its audio file', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const d = await r.createDhikr(cat.id, { text: 'نص', count: 1, audioFile: 'a.m4a' });
    expect(await r.deleteDhikr(d.id)).toEqual({ audioFile: 'a.m4a' });
    expect(await r.getDhikr(d.id)).toBeNull();
  });

  it('deleting a category removes its adhkar and returns their audio files', async () => {
    const r = await repo();
    const cat = await r.createCategory('باب');
    const other = await r.createCategory('آخر');
    await r.createDhikr(cat.id, { text: 'أ', count: 1, audioFile: 'a.m4a' });
    await r.createDhikr(cat.id, { text: 'ب', count: 1 });
    await r.createDhikr(other.id, { text: 'ج', count: 1, audioFile: 'c.m4a' });
    expect(await r.deleteCategory(cat.id)).toEqual({ audioFiles: ['a.m4a'] });
    expect((await r.listAdhkar(other.id)).map((d) => d.text)).toEqual(['ج']);
  });
});

describe('CustomRepository — search', () => {
  it('finds categories and adhkar without tashkeel, by word start', async () => {
    const r = await repo();
    const cat = await r.createCategory('أذكار المساء الخاصة');
    const d = await r.createDhikr(cat.id, { text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ', count: 3 });
    const byTitle = await r.search('اذكار');
    expect(byTitle.categories).toEqual([{ categoryId: cat.id, title: cat.title, custom: true }]);
    const byText = await r.search('استغف');
    expect(byText.adhkar).toEqual([
      {
        dhikrId: d.id,
        categoryId: cat.id,
        categoryTitle: 'أذكار المساء الخاصة',
        order: 1,
        text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ',
        custom: true,
      },
    ]);
    expect((await r.search('غفر')).adhkar).toEqual([]); // not a word start
    expect(await r.search('')).toEqual({ categories: [], adhkar: [] });
  });
});
