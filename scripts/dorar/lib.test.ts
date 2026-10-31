import type { DorarSourceEntry, DorarSources } from '../content/lib/types';

import { exactSpan, hadithFromPage, type SavedPage, setFadl, setNoSource, setSource } from './lib';

const TEXT = 'مَن قالَ: سُبحانَ اللهِ وبحَمدِه، في يَومٍ مِائةَ مَرَّةٍ، حُطَّتْ خَطاياه.';

const page = (over: Partial<SavedPage> = {}): SavedPage => ({
  url: 'https://dorar.net/h/abc',
  savedOn: '2026-10-17',
  results: [
    {
      text: TEXT,
      rawi: 'أبو هريرة',
      muhaddith: 'مسلم',
      book: 'صحيح مسلم',
      number: '2691',
      grading: 'صحيح',
    },
  ],
  ...over,
});

const file = (...entries: DorarSourceEntry[]): DorarSources => ({
  lang: 'ar',
  retrievedOn: '2026-10-17',
  entries,
});

const review = (): DorarSourceEntry => ({
  dhikrIds: [1017, 133017],
  status: 'review',
  reason: 'short',
  query: 'q',
  note: 'n',
  options: [hadithFromPage(page({ url: 'https://dorar.net/h/old' }))],
});

describe('exactSpan', () => {
  it('cuts the exact words out of the Dorar text, ignoring tashkeel', () => {
    expect(exactSpan(TEXT, 'حطت خطاياه')).toBe('حُطَّتْ خَطاياه');
    expect(exactSpan(TEXT, 'سبحان الله وبحمده')).toBe('سُبحانَ اللهِ وبحَمدِه');
  });

  it('refuses words that are not in the text', () => {
    expect(() => exactSpan(TEXT, 'غفرت ذنوبه')).toThrow(/Not found/);
  });
});

describe('setSource', () => {
  it('ships the page hadith for the morning and evening copies together', () => {
    const s = file(review());
    const e = setSource(s, 133017, hadithFromPage(page()), { date: '2026-10-20' });
    expect(e).toMatchObject({ status: 'matched', hadith: { url: 'https://dorar.net/h/abc' } });
    expect(e.dhikrIds).toEqual([1017, 133017]);
    expect(e.options).toBeUndefined();
    expect(e.reason).toBeUndefined();
    expect(e.note).toBe("Owner decision 2026-10-20: the owner's own Dorar link.");
  });

  it('cuts a fadl quote, or stores the owner words', () => {
    const s = file(review());
    setSource(s, 1017, hadithFromPage(page()), {
      date: 'd',
      fadl: { kind: 'quote', words: 'حطت خطاياه' },
    });
    expect(s.entries[0]!.fadl).toEqual({ text: 'حُطَّتْ خَطاياه', approved: true });
    setFadl(s, 1017, { kind: 'owner', text: ' من قال الدعاء غفر له ' });
    expect(s.entries[0]!.fadl).toEqual({
      text: 'من قال الدعاء غفر له',
      approved: true,
      by: 'owner',
    });
    setFadl(s, 1017, { kind: 'remove' });
    expect(s.entries[0]!.fadl).toBeUndefined();
  });

  it('drops a fadl and another verdict that belonged to a different narration', () => {
    const e: DorarSourceEntry = {
      ...review(),
      status: 'matched',
      hadith: hadithFromPage(page({ url: 'https://dorar.net/h/old' })),
      fadl: { text: 'حُطَّتْ خَطاياه', approved: true },
      otherGrading: {
        grading: 'ضعيف',
        muhaddith: 'م',
        book: 'ب',
        number: '1',
        url: 'https://dorar.net/h/x',
      },
    };
    const s = file(e);
    setSource(s, 1017, hadithFromPage(page()), { date: 'd' });
    expect(s.entries[0]!.fadl).toBeUndefined();
    expect(s.entries[0]!.otherGrading).toBeUndefined();
  });

  it('refuses a link that is not dorar.net, or an unknown dhikr', () => {
    expect(() => hadithFromPage(page({ url: 'https://example.com/h/1' }))).toThrow(/dorar\.net/);
    expect(() => hadithFromPage(page({ results: [] }))).toThrow(/No hadith/);
    expect(() => setSource(file(review()), 9001, hadithFromPage(page()), { date: 'd' })).toThrow(
      /No entry for dhikr 9001/,
    );
  });
});

describe('setNoSource', () => {
  it('leaves the dhikr without a source, by the owner decision', () => {
    const s = file(review());
    const e = setNoSource(s, 1017, { date: '2026-10-20', note: 'Text unchanged.' });
    expect(e.status).toBe('none');
    expect(e.hadith).toBeUndefined();
    expect(e.options).toBeUndefined();
    expect(e.note).toBe('Owner decision 2026-10-20: no source. Text unchanged.');
    expect(() => setFadl(s, 1017, { kind: 'remove' })).toThrow(/no shipped source/);
  });
});
