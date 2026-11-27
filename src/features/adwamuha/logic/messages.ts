import type { AdwamuhaMessage, AdwamuhaMoment, AdwamuhaText, MessagePick } from '@/data/models';

/**
 * What a moment shows: the app's own words (the owner's, from the content
 * database), or a message from the approved library.
 */
export type MessageContent =
  { kind: 'owner'; text: string } | { kind: 'library'; message: AdwamuhaMessage };

/** A message of a moment's pool, with a key that stays the same across launches. */
export interface PoolMessage {
  /** 'text:<id>' (the app's own words) or 'library:<id>' (a verse or hadith). */
  key: string;
  content: MessageContent;
}

/** Moments that show only the owner's own words (owner, 2026-10-29: both wards done → the prayer). */
export const OWNER_ONLY_MOMENTS: readonly AdwamuhaMoment[] = ['bothDone'];

/** The owner's messages for a moment first, then every library message for it. */
export function messagePool(
  moment: AdwamuhaMoment,
  texts: readonly AdwamuhaText[],
  library: readonly AdwamuhaMessage[],
): PoolMessage[] {
  const own = texts
    .filter((t) => t.moment === moment && t.state === '')
    .map((t) => ({ key: `text:${t.id}`, content: { kind: 'owner' as const, text: t.text } }));
  if (OWNER_ONLY_MOMENTS.includes(moment)) return own;
  return [
    ...own,
    ...library
      .filter((m) => m.moments.includes(moment))
      .map((message) => ({
        key: `library:${message.id}`,
        content: { kind: 'library' as const, message },
      })),
  ];
}

/**
 * The text chosen by a state: a stage's tip ('stage:2', 'maintenance') or the
 * welcome ('first:evening'); with state '' the owner's own message for a
 * moment. Null when there is none.
 */
export function textFor(
  texts: readonly AdwamuhaText[],
  moment: AdwamuhaText['moment'],
  state: string,
): string | null {
  return texts.find((t) => t.moment === moment && t.state === state)?.text ?? null;
}

/**
 * A number in [0, 1) that is always the same for the same key (FNV-1a): the "random" choice
 * for a message on Home, so it does not change on screen before it is dismissed (and saved).
 */
export function stableRandom(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 2 ** 32;
}

/**
 * The next message of a moment (owner, 2026-11-21): no message comes again
 * until every message of the pool has been shown. Within a round the order is
 * random; the next round starts with another message than the last one shown.
 * Messages added to the content join the round; removed ones are skipped.
 * `picks`: the moment's earlier picks, the latest first. `random`: in [0, 1).
 * Null for an empty pool (the texts are not read yet).
 */
export function nextPick(
  pool: readonly PoolMessage[],
  picks: readonly MessagePick[],
  random: () => number,
): { message: PoolMessage; round: number } | null {
  if (pool.length === 0) return null;
  const round = picks.reduce((max, p) => Math.max(max, p.round), 1);
  const used = new Set(picks.filter((p) => p.round === round).map((p) => p.messageId));
  let left = pool.filter((m) => !used.has(m.key));
  let next = round;
  if (left.length === 0) {
    // Every message came once: a new round, not starting with the message just shown.
    next = round + 1;
    const last = picks[0]?.messageId;
    left = pool.length > 1 ? pool.filter((m) => m.key !== last) : [...pool];
  }
  const index = Math.min(left.length - 1, Math.floor(random() * left.length));
  return { message: left[index]!, round: next };
}
