/**
 * Fadl and source of each dhikr, from content-source/dorar-sources.json.
 *
 * Rules (docs/brief.md §5, docs/decisions.md):
 * - Everything comes from dorar.net, copied exactly; nothing is written from memory.
 * - Only `matched` entries are shipped. `review` entries wait for the owner;
 *   `none` entries are dhikr the owner left without a source.
 * - A fadl is shipped only after the owner approves it. It is an exact quote
 *   from the Dorar hadith text, or the owner's own words (`by: 'owner'`).
 * - Approved Dorar wording replaces the current words (applyApprovedWording).
 */
import type {
  ChangeLogEntry,
  ContentDhikr,
  ContentSource,
  DorarHadith,
  DorarSourceEntry,
  DorarSources,
} from './types.ts';

function fail(message: string): never {
  throw new Error(`dorar-sources.json: ${message}`);
}

const where = (e: DorarSourceEntry) => `entry for ${e.dhikrIds.join(', ')}`;

/** "[صحيح]" → "صحيح". */
export function cleanGrading(grading: string): string {
  return grading
    .replace(/^\s*\[\s*/, '')
    .replace(/\s*\]\s*$/, '')
    .trim();
}

/**
 * What the reader shows after "المصدر:". Dorar's own fields, in a fixed order.
 * Dorar writes "-" when no narrator is named; then the narrator is left out.
 */
export function formatSource(h: DorarHadith): string {
  const rawi = h.rawi.trim();
  const book = `${h.book} (${h.number})`;
  return rawi && rawi !== '-' ? `${book} — الراوي: ${rawi}` : book;
}

/** What the reader shows after "الحكم:": the grading and who graded it. */
export function formatGrading(h: DorarHadith): string | null {
  const grading = cleanGrading(h.grading);
  return grading ? `${grading} — ${h.muhaddith}` : null;
}

const REQUIRED: (keyof DorarHadith)[] = ['url', 'text', 'rawi', 'muhaddith', 'book', 'number'];

/** Checks the file against the content and returns the rows to ship. */
export function buildSources(
  adhkar: readonly ContentDhikr[],
  dorar: DorarSources,
  lang: string,
): ContentSource[] {
  if (dorar.lang !== lang) fail(`is for "${dorar.lang}", expected "${lang}"`);
  const known = new Set(adhkar.map((a) => a.id));
  const seen = new Set<number>();
  const rows: ContentSource[] = [];

  for (const e of dorar.entries) {
    if (e.dhikrIds.length === 0) fail('an entry has no dhikr ids');
    for (const id of e.dhikrIds) {
      if (!known.has(id)) fail(`unknown dhikr ${id}`);
      if (seen.has(id)) fail(`dhikr ${id} appears twice`);
      seen.add(id);
    }
    if (e.fadl && !e.hadith) fail(`${where(e)}: a fadl needs the hadith it is quoted from`);
    if (e.fadl?.by === 'owner' && !e.fadl.approved) {
      fail(`${where(e)}: a fadl written by the owner must be approved`);
    }
    if (e.status === 'none') {
      if (e.fadl) fail(`${where(e)}: a fadl on an entry the owner left without a source`);
      continue;
    }
    if (e.status === 'review') {
      if (e.fadl?.approved) fail(`${where(e)}: approved fadl on an entry still under review`);
      continue;
    }

    const h = e.hadith ?? fail(`${where(e)}: matched but no hadith`);
    for (const key of REQUIRED) {
      if (!h[key]?.trim()) fail(`${where(e)}: hadith.${key} is empty`);
    }
    if (!/^https:\/\/(www\.)?dorar\.net\//.test(h.url)) {
      fail(`${where(e)}: "${h.url}" is not a dorar.net link`);
    }
    if (e.fadl?.by === 'owner') {
      if (!e.fadl.text.trim()) fail(`${where(e)}: the owner's fadl is empty`);
    } else if (e.fadl && !h.text.includes(e.fadl.text)) {
      fail(`${where(e)}: the fadl is not an exact quote from the Dorar text`);
    }
    for (const dhikrId of e.dhikrIds) {
      rows.push({
        dhikrId,
        lang,
        fadl: e.fadl?.approved ? e.fadl.text : null,
        source: formatSource(h),
        grading: formatGrading(h),
        dorarUrl: h.url,
      });
    }
  }
  return rows.sort((a, b) => a.dhikrId - b.dhikrId);
}

/**
 * Puts approved Dorar wording in place of the current words, and checks the
 * ones still waiting. Every proposal must be honest: the current words are
 * really in the dhikr (once), and the proposed words are an exact quote from
 * the Dorar hadith.
 */
export function applyApprovedWording(
  adhkar: ContentDhikr[],
  dorar: DorarSources,
  lang: string,
  changes: ChangeLogEntry[],
): void {
  for (const p of dorar.wordingProposals ?? []) {
    const d = adhkar.find((a) => a.id === p.dhikrId) ?? fail(`wording: unknown dhikr ${p.dhikrId}`);
    if (!p.hadith.text.includes(p.proposed)) {
      fail(
        `wording for ${p.dhikrId}: the proposed words are not an exact quote from the Dorar text`,
      );
    }
    if (!/^https:\/\/(www\.)?dorar\.net\//.test(p.hadith.url)) {
      fail(`wording for ${p.dhikrId}: "${p.hadith.url}" is not a dorar.net link`);
    }
    const text = d.texts[lang] ?? '';
    const at = text.indexOf(p.current);
    if (at === -1) fail(`wording for ${p.dhikrId}: "${p.current}" is not in the dhikr text`);
    if (!p.approved) continue;
    if (text.indexOf(p.current, at + p.current.length) !== -1) {
      fail(`wording for ${p.dhikrId}: "${p.current}" is in the dhikr text twice`);
    }
    d.texts[lang] = text.slice(0, at) + p.proposed + text.slice(at + p.current.length);
    changes.push({
      kind: 'wording',
      where: `dhikr ${p.dhikrId}`,
      detail: `"${p.current}" → "${p.proposed}". ${p.note} Owner approved (${p.hadith.url}).`,
    });
  }
}
