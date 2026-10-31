/**
 * Line breaks between the parts of a long dhikr (owner decision 2026-10-22,
 * option a: "each part on its own line", e.g. the three surahs).
 *
 * - Before each "بسم الله الرحمن الرحيم" that is not at the start: each surah
 *   on its own line (1002, 2001, 27005).
 * - Between the isti'adha and the verse after it (1001: آية الكرسي).
 * - Before "ثُمَّ" right after a verse: the next step (2001: ثم يمسح بهما…).
 * - In a list of steps joined by " - " (only the adhkar named in
 *   overrides.json, e.g. 31001): one step per line. Other dashes in the book
 *   mark side notes inside a sentence and stay.
 *
 * Only spaces are replaced; no letter or mark changes.
 */
const TASHKEEL = /[ً-ٰٟ]/g;

/**
 * A word matched by its letters, with any tashkeel after each letter: the book
 * stores marks in different orders (e.g. shadda before or after fatha).
 */
function loose(word: string): string {
  return [...word.replace(TASHKEEL, '')].map((ch) => `${ch}[\\u064B-\\u065F\\u0670]*`).join('');
}

const BASMALA = loose('بسم الله الرحمن الرحيم');
const ISTIADHA_END = loose('الرجيم');
const THEN = loose('ثم');

export function addLineBreaks(text: string, opts: { stepList?: boolean } = {}): string {
  let out = text
    .replace(new RegExp(`(\\S)[^\\S\\n]*(${BASMALA})`, 'g'), '$1\n$2')
    .replace(new RegExp(`(${ISTIADHA_END})[^\\S\\n]+(﴿)`, 'g'), '$1\n$2')
    .replace(new RegExp(`(﴾)[^\\S\\n]+(${THEN})(?=[^\\S\\n])`, 'g'), '$1\n$2');
  if (opts.stepList) out = out.replace(/[^\S\n]+-[^\S\n]+/g, '\n- ');
  return out;
}
