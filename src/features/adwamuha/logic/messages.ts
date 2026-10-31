import type { AdwamuhaMessage, AdwamuhaMoment, AdwamuhaText } from '@/data/models';

/**
 * What a moment shows: the app's own words (the owner's, from the content
 * database), or a message from the approved library.
 */
export type MessageContent =
  { kind: 'owner'; text: string } | { kind: 'library'; message: AdwamuhaMessage };

/** Moments that show only the owner's own words (owner, 2026-10-29: both wards done → the prayer). */
export const OWNER_ONLY_MOMENTS: readonly AdwamuhaMoment[] = ['bothDone'];

/** The owner's messages for a moment first, then every library message for it. */
export function messagePool(
  moment: AdwamuhaMoment,
  texts: readonly AdwamuhaText[],
  library: readonly AdwamuhaMessage[],
): MessageContent[] {
  const own = texts
    .filter((t) => t.moment === moment && t.state === '')
    .map((t) => ({ kind: 'owner' as const, text: t.text }));
  if (OWNER_ONLY_MOMENTS.includes(moment)) return own;
  return [
    ...own,
    ...library
      .filter((m) => m.moments.includes(moment))
      .map((message) => ({ kind: 'library' as const, message })),
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

/** FNV-1a: a small, stable hash of a string. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One message of the pool, picked by `key` (the occasion: a day's ward, an
 * event, a week). The same occasion always gets the same message, so it does
 * not change on a re-render or the next launch; different occasions vary.
 * Null for an empty pool (the texts are not read yet).
 */
export function pickMessage(pool: readonly MessageContent[], key: string): MessageContent | null {
  if (pool.length === 0) return null;
  return pool[hash(key) % pool.length]!;
}
