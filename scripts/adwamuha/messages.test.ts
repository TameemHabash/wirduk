import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ADWAMUHA_MOMENTS } from '../../src/data/models';

import {
  LIBRARY_FILE,
  type LibraryMessage,
  MOMENTS,
  type MessageLibrary,
  REVIEW_FILE,
  addMessage,
  checkLibrary,
  dorarId,
  isGoodGrading,
  parseMoments,
  parseTanzil,
  renderReview,
  shippedMessages,
  verseFromTanzil,
  verseId,
} from './messages';

const root = join(__dirname, '..', '..');

// A tiny stand-in for Tanzil's files (placeholder words, not Quran text).
const TEXT = [
  '1|1|first',
  '1|2|second',
  '2|1|third',
  '',
  '# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK',
  '#  Tanzil Quran Text (Uthmani, Version 1.1)',
].join('\n');
const XML =
  '<suras><sura index="1" ayas="2" name="One" /><sura index="2" ayas="1" name="Two" /></suras>';

const hadith = (grading: string): LibraryMessage => ({
  id: 'd-abc',
  kind: 'hadith',
  moments: ['wardDone'],
  status: 'candidate',
  hadith: {
    url: 'https://dorar.net/h/abc',
    text: 'text',
    rawi: 'rawi',
    muhaddith: 'muhaddith',
    book: 'book',
    number: '1',
    grading,
  },
  addedOn: '2026-10-24',
});

describe('the Adwamuha message library', () => {
  it('cuts one or more verses and the surah name from Tanzil', () => {
    const tanzil = parseTanzil(TEXT, XML);
    expect(tanzil.version).toBe('Tanzil Quran Text (Uthmani, Version 1.1)');
    const v = verseFromTanzil(tanzil, '1:1-2');
    expect(v).toEqual({ sura: 1, suraName: 'One', from: 1, to: 2, texts: ['first', 'second'] });
    expect(verseId(v)).toBe('q1-1-2');
    expect(verseId(verseFromTanzil(tanzil, '2:1'))).toBe('q2-1');
    expect(() => verseFromTanzil(tanzil, '1:3')).toThrow(/No verse 1:3/);
    expect(() => verseFromTanzil(tanzil, '1:2-1')).toThrow(/in order/);
    expect(() => parseTanzil('1|1|x', XML)).toThrow(/Not a Tanzil text/);
  });

  it('accepts only صحيح or حسن as a grading', () => {
    expect(isGoodGrading('[صحيح]')).toBe(true);
    expect(isGoodGrading('إسناده حسن')).toBe(true);
    expect(isGoodGrading('حسن صحيح')).toBe(true);
    expect(isGoodGrading('أخرجه في صحيحه')).toBe(false);
    expect(isGoodGrading('رجاله رجال الصحيح')).toBe(false);
    expect(isGoodGrading('إسناده ضعيف')).toBe(false);
    expect(checkLibrary({ about: '', tanzil: null, messages: [hadith('إسناده ضعيف')] })).toEqual([
      'd-abc: grading "إسناده ضعيف" is not صحيح or حسن',
    ]);
  });

  it('the app knows the same eight moments', () => {
    expect([...ADWAMUHA_MOMENTS]).toEqual([...MOMENTS]);
  });

  it('ships only the approved entries, verses one per line', () => {
    const verse: LibraryMessage = {
      id: 'q1-1-2',
      kind: 'verse',
      moments: ['finished'],
      status: 'approved',
      verse: verseFromTanzil(parseTanzil(TEXT, XML), '1:1-2'),
      addedOn: '2026-10-24',
    };
    const lib: MessageLibrary = {
      about: '',
      tanzil: { version: 'v', sha256: 'x' },
      messages: [verse, hadith('صحيح')],
    };
    expect(shippedMessages(lib, 'ar')).toEqual([
      {
        lang: 'ar',
        id: 'q1-1-2',
        kind: 'verse',
        moments: ['finished'],
        text: 'first\nsecond',
        verse: { sura: 1, suraName: 'One', from: 1, to: 2 },
        hadith: null,
      },
    ]);
  });

  it('knows only the eight moments, and keeps the status when an entry is added again', () => {
    expect(parseMoments('wardDone,finished')).toEqual(['wardDone', 'finished']);
    expect(() => parseMoments('wardDone,later')).toThrow(/Unknown moment "later"/);
    expect(dorarId('https://dorar.net/h/ZDH7AalJ')).toBe('d-ZDH7AalJ');
    const lib: MessageLibrary = { about: '', tanzil: null, messages: [] };
    addMessage(lib, hadith('صحيح'));
    lib.messages[0]!.status = 'approved';
    addMessage(lib, { ...hadith('صحيح'), moments: ['finished'] });
    expect(lib.messages).toHaveLength(1);
    expect(lib.messages[0]).toMatchObject({ status: 'approved', moments: ['finished'] });
  });

  it('the library is valid, and the review page is up to date (run `messages.ts review`)', () => {
    const lib = JSON.parse(readFileSync(join(root, LIBRARY_FILE), 'utf8')) as MessageLibrary;
    expect(checkLibrary(lib)).toEqual([]);
    expect(readFileSync(join(root, REVIEW_FILE), 'utf8')).toBe(renderReview(lib));
  });
});
