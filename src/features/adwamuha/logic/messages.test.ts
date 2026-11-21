import type { AdwamuhaMessage, AdwamuhaText } from '@/data/models';

import { type MessagePick, messagePool, nextPick, textFor } from './messages';

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
      { key: 'text:wardDone:', content: { kind: 'owner', text: 'owner' } },
      { key: 'library:a', content: { kind: 'library', message: library[0] } },
      { key: 'library:b', content: { kind: 'library', message: library[1] } },
    ]);
    expect(messagePool('newStep', texts, library).map((m) => m.content)).toEqual([
      { kind: 'owner', text: 'new step' },
    ]);
  });

  it('both wards done: only the owner’s prayer, never a library message', () => {
    expect(messagePool('bothDone', texts, library).map((m) => m.content)).toEqual([
      { kind: 'owner', text: 'prayer' },
    ]);
  });

  it('a tip or the welcome is chosen by its state', () => {
    expect(textFor(texts, 'tip', 'stage:1')).toBe('tip 1');
    expect(textFor(texts, 'tip', 'maintenance')).toBe('keep it');
    expect(textFor(texts, 'welcome', 'first:evening')).toBe('welcome');
    expect(textFor(texts, 'tip', 'stage:9')).toBeNull();
  });
});

describe('the next message: none again until all were shown (owner, 2026-11-21)', () => {
  const pool = ['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => ({
    key: `library:${id}`,
    content: { kind: 'owner' as const, text: id },
  }));

  /** `n` occasions in a row, as the app saves them (the latest first). */
  function walk(n: number, random: () => number, start: MessagePick[] = []): MessagePick[] {
    const picks = [...start];
    for (let i = 0; i < n; i++) {
      const next = nextPick(pool, picks, random)!;
      picks.unshift({ occasion: `o${i}`, messageId: next.message.key, round: next.round });
    }
    return picks.reverse();
  }

  it.each([
    ['always the first left', () => 0],
    ['always the last left', () => 0.999],
    ['random', Math.random],
  ])('every message once per round (%s)', (_, random) => {
    const picks = walk(15, random);
    for (const round of [1, 2, 3]) {
      const ids = picks.filter((p) => p.round === round).map((p) => p.messageId);
      expect(new Set(ids).size).toBe(5);
    }
    // A new round never starts with the message just shown.
    expect(picks[5]!.messageId).not.toBe(picks[4]!.messageId);
    expect(picks[10]!.messageId).not.toBe(picks[9]!.messageId);
  });

  it('a message added to the content joins the round; a removed one is skipped', () => {
    const start: MessagePick[] = [
      { occasion: 'b', messageId: 'library:gone', round: 1 },
      { occasion: 'a', messageId: 'library:m1', round: 1 },
    ];
    const picks = walk(4, () => 0, start).slice(2);
    expect(picks.map((p) => [p.messageId, p.round])).toEqual([
      ['library:m2', 1],
      ['library:m3', 1],
      ['library:m4', 1],
      ['library:m5', 1],
    ]);
  });

  it('a pool of one: that message each time; nothing before the texts are read', () => {
    const one = pool.slice(0, 1);
    const first = nextPick(one, [], () => 0)!;
    expect(first).toEqual({ message: one[0], round: 1 });
    const again = nextPick(one, [{ occasion: 'x', messageId: 'library:m1', round: 1 }], () => 0)!;
    expect(again).toEqual({ message: one[0], round: 2 });
    expect(nextPick([], [], () => 0)).toBeNull();
  });
});
