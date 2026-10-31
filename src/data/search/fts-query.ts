import { toSearchText } from '@/text/normalize';

/** Words shorter than this are ignored, unless the whole query is one short word. */
const MIN_WORD_LENGTH = 2;

/** Normalized words of a user query (same rules as the stored SearchText). */
export function queryWords(input: string): string[] {
  const words = toSearchText(input).split(' ').filter(Boolean);
  const long = words.filter((w) => w.length >= MIN_WORD_LENGTH);
  return long.length > 0 ? long : words.slice(0, 1);
}

/**
 * Turns what the user typed into a safe FTS5 query: every word must appear,
 * and each word also matches longer words that start with it (prefix match).
 *
 * Returns null when there is nothing to search for.
 *
 * Words only contain letters and digits after normalization, so they can be
 * quoted safely: FTS5 syntax characters can never reach the query.
 */
export function buildFtsQuery(input: string): string | null {
  const words = queryWords(input);
  if (words.length === 0) return null;
  return words.map((w) => `"${w}"*`).join(' ');
}
