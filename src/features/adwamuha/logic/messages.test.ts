import type { AdwamuhaMessage, AdwamuhaText } from '@/data/models';

import { messagePool, pickMessage, textFor } from './messages';

const message = (id: string, moments: AdwamuhaMessage['moments']): AdwamuhaMessage => ({
  id,
  kind: 'hadith',
  moments,
  texts: [id],
  verse: null,
  hadith: null,
});

const library = [
  message('a', ['wardDone']),
  message('b', ['wardDone', 'finished', 'bothDone']),
  message('c', ['weekBelow']),
];

const text = (moment: AdwamuhaText['moment'], state: string, words: string): AdwamuhaText => ({
  id: `${moment}:${state}`,
  moment,
  state,
  text: words,
});

const texts = [
  text('wardDone', '', 'owner'),
  text('bothDone', '', 'prayer'),
  text('newStep', '', 'new step'),
  text('tip', 'stage:1', 'tip 1'),
  text('tip', 'maintenance', 'keep it'),
  text('welcome', 'first:evening', 'welcome'),
];

describe("Adwamuha's messages", () => {
  it("a moment's pool: the owner's message, then the library messages for that moment", () => {
    const pool = messagePool('wardDone', texts, library);
    expect(pool).toEqual([
      { kind: 'owner', text: 'owner' },
      { kind: 'library', message: library[0] },
      { kind: 'library', message: library[1] },
    ]);
    expect(messagePool('newStep', texts, library)).toEqual([{ kind: 'owner', text: 'new step' }]);
  });

  it('both wards done: only the owner’s prayer, never a library message', () => {
    expect(messagePool('bothDone', texts, library)).toEqual([{ kind: 'owner', text: 'prayer' }]);
  });

  it('the same occasion always gets the same message, and occasions vary', () => {
    const pool = messagePool('wardDone', texts, library);
    const key = 'ward:2026-05-12:morning';
    expect(pickMessage(pool, key)).toBe(pickMessage(pool, key));
    const picked = new Set(
      Array.from({ length: 60 }, (_, i) => pickMessage(pool, `ward:2026-05-${i}:morning`)),
    );
    expect(picked.size).toBe(3); // every message of the pool comes up
  });

  it('nothing to pick before the texts are read', () => {
    expect(pickMessage(messagePool('extended', [], []), 'x')).toBeNull();
  });

  it('a tip or the welcome is chosen by its state', () => {
    expect(textFor(texts, 'tip', 'stage:1')).toBe('tip 1');
    expect(textFor(texts, 'tip', 'maintenance')).toBe('keep it');
    expect(textFor(texts, 'welcome', 'first:evening')).toBe('welcome');
    expect(textFor(texts, 'tip', 'stage:9')).toBeNull();
  });
});
