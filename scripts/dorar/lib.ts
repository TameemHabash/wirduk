/**
 * Editing content-source/dorar-sources.json from Dorar pages the owner chose.
 *
 * Rules (docs/brief.md §5, docs/decisions.md): every hadith field is copied
 * from a saved Dorar page, never typed. A fadl quote is cut out of the Dorar
 * text (exactSpan), so it is always an exact quote.
 */
import { toSearchText } from '../../src/text/normalize.ts';
import type { DorarHadith, DorarSourceEntry, DorarSources } from '../content/lib/types.ts';

/** What `browser-helpers.js` saves for one Dorar page (through `receiver.ts`). */
export interface SavedPage {
  /** The link as the owner gave it (a /h/… or /hadith/sharh/… page). */
  url: string;
  savedOn: string;
  results: {
    text: string;
    rawi: string;
    muhaddith: string;
    book: string;
    number: string;
    grading: string;
  }[];
}

/**
 * The exact span of `text` whose words are `phrase`, ignoring tashkeel and
 * letter forms (the app's search folding). Edge punctuation is trimmed.
 */
export function exactSpan(text: string, phrase: string): string {
  const want = toSearchText(phrase).split(' ').filter(Boolean);
  if (want.length === 0) throw new Error('Empty phrase');
  const toks: { w: string; start: number; end: number }[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    for (const w of toSearchText(m[0]).split(' ').filter(Boolean)) {
      toks.push({ w, start: m.index, end: m.index + m[0].length });
    }
  }
  for (let i = 0; i + want.length <= toks.length; i++) {
    if (want.every((w, k) => toks[i + k]!.w === w)) {
      const span = text.slice(toks[i]!.start, toks[i + want.length - 1]!.end);
      return span.replace(/^[^\p{L}]+/u, '').replace(/[^\p{L}\p{M}]+$/u, '');
    }
  }
  throw new Error(`Not found in the Dorar text: "${phrase}"`);
}

/** The hadith of a saved page (a /h/ or sharh page has exactly one). */
export function hadithFromPage(page: SavedPage, index = 0): DorarHadith {
  if (!/^https:\/\/(www\.)?dorar\.net\//.test(page.url)) {
    throw new Error(`Not a dorar.net link: ${page.url}`);
  }
  const r = page.results[index];
  if (!r) throw new Error(`No hadith #${index} on ${page.url} (${page.results.length} found)`);
  return {
    url: page.url,
    text: r.text,
    rawi: r.rawi,
    muhaddith: r.muhaddith,
    book: r.book,
    number: r.number,
    grading: r.grading,
  };
}

function entryOf(sources: DorarSources, dhikrId: number): DorarSourceEntry {
  const e = sources.entries.find((x) => x.dhikrIds.includes(dhikrId));
  if (!e) throw new Error(`No entry for dhikr ${dhikrId}`);
  return e;
}

export type FadlChoice =
  /** Words of the hadith, cut out exactly. */
  | { kind: 'quote'; words: string }
  /** The owner's own words (not checked against Dorar). */
  | { kind: 'owner'; text: string }
  | { kind: 'remove' };

/**
 * Ships `hadith` as the source of the entry holding `dhikrId` (the morning
 * and evening copies share one entry). A fadl or another scholar's verdict
 * that belonged to a different narration is dropped.
 */
export function setSource(
  sources: DorarSources,
  dhikrId: number,
  hadith: DorarHadith,
  opts: { date: string; note?: string; fadl?: FadlChoice },
): DorarSourceEntry {
  const e = entryOf(sources, dhikrId);
  const changed = e.hadith?.url !== hadith.url;
  e.status = 'matched';
  delete e.reason;
  delete e.options;
  if (changed) {
    delete e.otherGrading;
    delete e.fadl;
  }
  e.hadith = hadith;
  e.note = `Owner decision ${opts.date}: ${opts.note ?? "the owner's own Dorar link"}.`;
  applyFadl(e, opts.fadl);
  return e;
}

/** The owner decided this dhikr shows no source. */
export function setNoSource(
  sources: DorarSources,
  dhikrId: number,
  opts: { date: string; note?: string },
): DorarSourceEntry {
  const e = entryOf(sources, dhikrId);
  e.status = 'none';
  for (const k of ['reason', 'options', 'hadith', 'otherGrading', 'fadl'] as const) delete e[k];
  e.note = `Owner decision ${opts.date}: no source.${opts.note ? ` ${opts.note}` : ''}`;
  return e;
}

/** Changes only the fadl of a shipped entry. */
export function setFadl(sources: DorarSources, dhikrId: number, fadl: FadlChoice): void {
  const e = entryOf(sources, dhikrId);
  if (e.status !== 'matched') throw new Error(`Dhikr ${dhikrId} has no shipped source`);
  applyFadl(e, fadl);
}

function applyFadl(e: DorarSourceEntry, fadl: FadlChoice | undefined): void {
  if (!fadl) return;
  if (fadl.kind === 'remove') delete e.fadl;
  else if (fadl.kind === 'owner') e.fadl = { text: fadl.text.trim(), approved: true, by: 'owner' };
  else e.fadl = { text: exactSpan(e.hadith!.text, fadl.words), approved: true };
}
