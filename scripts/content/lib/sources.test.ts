import {
  applyApprovedWording,
  buildSources,
  cleanGrading,
  formatGrading,
  formatSource,
} from './sources';
import type {
  ChangeLogEntry,
  ContentDhikr,
  DorarHadith,
  DorarSourceEntry,
  DorarSources,
} from './types';

const dhikr = (id: number): ContentDhikr => ({
  id,
  categoryId: Math.floor(id / 1000),
  sortOrder: id % 1000,
  count: 1,
  audioFile: null,
  texts: { ar: 'نص' },
});
const ADHKAR = [dhikr(1001), dhikr(1002), dhikr(133001)];

const hadith = (over: Partial<DorarHadith> = {}): DorarHadith => ({
  url: 'https://dorar.net/hadith/sharh/123',
  text: 'من قال سبحان الله وبحمده في يوم مائة مرة حطت خطاياه',
  rawi: 'أبو هريرة',
  muhaddith: 'البخاري',
  book: 'صحيح البخاري',
  number: '6405',
  grading: '[صحيح]',
  ...over,
});

const file = (...entries: DorarSourceEntry[]): DorarSources => ({
  lang: 'ar',
  retrievedOn: '2026-10-17',
  entries,
});

const matched = (over: Partial<DorarSourceEntry> = {}): DorarSourceEntry => ({
  dhikrIds: [1001, 133001],
  status: 'matched',
  query: 'سبحان الله وبحمده',
  note: 'test',
  hadith: hadith(),
  ...over,
});

describe('formatting Dorar fields', () => {
  it('builds the source and grading lines from Dorar fields only', () => {
    expect(formatSource(hadith())).toBe('صحيح البخاري (6405) — الراوي: أبو هريرة');
    expect(formatGrading(hadith())).toBe('صحيح — البخاري');
    expect(cleanGrading(' [ إسناده حسن ] ')).toBe('إسناده حسن');
    expect(formatGrading(hadith({ grading: '' }))).toBeNull();
  });

  it('leaves the narrator out when Dorar names none ("-")', () => {
    expect(formatSource(hadith({ rawi: '-' }))).toBe('صحيح البخاري (6405)');
  });
});

describe('applyApprovedWording', () => {
  const MORNING = 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ';
  const EVENING = 'أمسَينا وأمسى المُلكُ للَّهِ';
  const adhkar = () => [{ ...dhikr(133003), texts: { ar: `((${MORNING})).` } }];
  const proposal = (current: string, proposed: string, approved?: boolean) => ({
    ...file(),
    wordingProposals: [
      {
        dhikrId: 133003,
        current,
        proposed,
        note: 'Evening form.',
        hadith: hadith({ text: `إذا أمسى قال: ${EVENING}` }),
        ...(approved ? { approved } : {}),
      },
    ],
  });

  it('leaves the text alone until the owner approves, but still checks the proposal', () => {
    const list = adhkar();
    const changes: ChangeLogEntry[] = [];
    applyApprovedWording(list, proposal(MORNING, EVENING), 'ar', changes);
    expect(list[0]!.texts.ar).toBe(`((${MORNING})).`);
    expect(changes).toEqual([]);
  });

  it('puts the approved Dorar words in place and logs it', () => {
    const list = adhkar();
    const changes: ChangeLogEntry[] = [];
    applyApprovedWording(list, proposal(MORNING, EVENING, true), 'ar', changes);
    expect(list[0]!.texts.ar).toBe(`((${EVENING})).`);
    expect(changes).toEqual([expect.objectContaining({ kind: 'wording', where: 'dhikr 133003' })]);
  });

  it('refuses words that are not in the dhikr, or not an exact quote from Dorar', () => {
    const run = (current: string, proposed: string) => () =>
      applyApprovedWording(adhkar(), proposal(current, proposed, true), 'ar', []);
    expect(run('أصبحنا وأصبح الملك لله', EVENING)).toThrow(/is not in the dhikr text/);
    expect(run(MORNING, 'أمسينا وأمسى الملك لله')).toThrow(/not an exact quote/);
  });
});

describe('buildSources', () => {
  it('ships one row per dhikr of a matched entry (morning and evening share it)', () => {
    const rows = buildSources(ADHKAR, file(matched()), 'ar');
    expect(rows.map((r) => r.dhikrId)).toEqual([1001, 133001]);
    expect(rows[0]).toEqual({
      dhikrId: 1001,
      lang: 'ar',
      fadl: null,
      source: 'صحيح البخاري (6405) — الراوي: أبو هريرة',
      grading: 'صحيح — البخاري',
      dorarUrl: 'https://dorar.net/hadith/sharh/123',
    });
  });

  it('ships nothing for an entry under review', () => {
    expect(buildSources(ADHKAR, file(matched({ status: 'review' })), 'ar')).toEqual([]);
  });

  it('ships a fadl only after the owner approves it', () => {
    const quote = 'حطت خطاياه';
    const waiting = buildSources(
      ADHKAR,
      file(matched({ fadl: { text: quote, approved: false } })),
      'ar',
    );
    expect(waiting[0]!.fadl).toBeNull();
    const approved = buildSources(
      ADHKAR,
      file(matched({ fadl: { text: quote, approved: true } })),
      'ar',
    );
    expect(approved[0]!.fadl).toBe(quote);
  });

  it('refuses a fadl that is not an exact quote from the Dorar text', () => {
    const entry = matched({ fadl: { text: 'غفرت ذنوبه', approved: false } });
    expect(() => buildSources(ADHKAR, file(entry), 'ar')).toThrow(/not an exact quote/);
  });

  it('refuses an approved fadl on an entry still under review', () => {
    const entry = matched({ status: 'review', fadl: { text: 'حطت خطاياه', approved: true } });
    expect(() => buildSources(ADHKAR, file(entry), 'ar')).toThrow(/under review/);
  });

  it('refuses unknown or repeated dhikr ids', () => {
    expect(() => buildSources(ADHKAR, file(matched({ dhikrIds: [9001] })), 'ar')).toThrow(
      /unknown dhikr 9001/,
    );
    expect(() =>
      buildSources(ADHKAR, file(matched(), matched({ dhikrIds: [1001] })), 'ar'),
    ).toThrow(/1001 appears twice/);
  });

  it('refuses links that are not dorar.net and missing fields', () => {
    expect(() =>
      buildSources(
        ADHKAR,
        file(matched({ hadith: hadith({ url: 'https://example.com/x' }) })),
        'ar',
      ),
    ).toThrow(/not a dorar.net link/);
    expect(() =>
      buildSources(ADHKAR, file(matched({ hadith: hadith({ book: ' ' }) })), 'ar'),
    ).toThrow(/hadith.book is empty/);
    expect(() => buildSources(ADHKAR, file(matched({ hadith: undefined })), 'ar')).toThrow(
      /matched but no hadith/,
    );
  });

  it('ships nothing for an entry the owner left without a source', () => {
    expect(
      buildSources(ADHKAR, file(matched({ status: 'none', hadith: undefined })), 'ar'),
    ).toEqual([]);
    const withFadl = matched({ status: 'none', fadl: { text: 'حطت خطاياه', approved: false } });
    expect(() => buildSources(ADHKAR, file(withFadl), 'ar')).toThrow(/without a source/);
  });

  it("ships the owner's own fadl words, which need not be a quote, once approved", () => {
    const words = 'من قال الدعاء حطت خطاياه';
    const rows = buildSources(
      ADHKAR,
      file(matched({ fadl: { text: words, approved: true, by: 'owner' } })),
      'ar',
    );
    expect(rows[0]!.fadl).toBe(words);
    expect(() =>
      buildSources(
        ADHKAR,
        file(matched({ fadl: { text: words, approved: false, by: 'owner' } })),
        'ar',
      ),
    ).toThrow(/must be approved/);
  });

  it('refuses a file for another language', () => {
    expect(() => buildSources(ADHKAR, { ...file(), lang: 'en' }, 'ar')).toThrow(/expected "ar"/);
  });
});
