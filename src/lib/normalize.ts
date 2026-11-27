/**
 * Arabic text helpers, shared by the app and the content build script.
 *
 * No imports and no TypeScript-only syntax (enums, namespaces): the build
 * script runs this file directly in Node.
 *
 * Two different jobs:
 *  - `cleanDisplayText`: tiny, safe fixes to text that IS shown. Tashkeel and
 *    wording are never touched.
 *  - `toSearchText`: an aggressive form that is NEVER shown. It only feeds the
 *    FTS index and the search query.
 *
 * Character ranges are written as hex code points (not as raw characters):
 * many of them are invisible or combining marks.
 */

const ch = (codePoint: number): string => String.fromCodePoint(codePoint);
const range = (from: number, to: number): string => `${ch(from)}-${ch(to)}`;

/** Arabic Presentation Forms-A (U+FB50–U+FDFF) and -B (U+FE70–U+FEFF). */
const PRESENTATION_FORMS = new RegExp(`[${range(0xfb50, 0xfdff)}${range(0xfe70, 0xfeff)}]`, 'g');

/**
 * Characters in the presentation-form blocks that are real symbols, not
 * copy artifacts. They are kept in display text.
 *  U+FD3E U+FD3F  ornate parentheses (Quran brackets)
 *  U+FDF2         ligature "Allah"
 *  U+FDFA         ligature "sallallahu alayhi wa sallam"
 *  U+FDFB         ligature "jalla jalaluhu"
 *  U+FDFD         ligature "bismillah ar-rahman ar-rahim"
 */
const KEEP_IN_DISPLAY = new Set([0xfd3e, 0xfd3f, 0xfdf2, 0xfdfa, 0xfdfb, 0xfdfd].map(ch));

/** U+FEFF zero-width no-break space / BOM. Invisible noise. */
const BOM = ch(0xfeff);

/**
 * Replaces PDF-copy artifacts (letter-shape "presentation forms" such as
 * U+FE97 U+FEEC for "ته") with the normal letters. They look the same on
 * screen, but they break search and some fonts. Everything else is returned
 * unchanged.
 */
export function cleanDisplayText(text: string): string {
  return text.replace(PRESENTATION_FORMS, (c) => {
    if (c === BOM) return '';
    if (KEEP_IN_DISPLAY.has(c)) return c;
    return c.normalize('NFKC');
  });
}

/**
 * Tashkeel, Quranic annotation marks and tatweel:
 *  U+0610–U+061A  small high marks
 *  U+064B–U+065F  harakat, tanween, shadda, sukun, madda, hamza marks
 *  U+0670         superscript (dagger) alef
 *  U+06D6–U+06ED  Quranic stop signs and small letters
 *  U+0640         tatweel
 */
const MARKS = new RegExp(
  `[${range(0x0610, 0x061a)}${range(0x064b, 0x065f)}${ch(0x0670)}${range(0x06d6, 0x06ed)}${ch(0x0640)}]`,
  'g',
);

/** Letter variants folded to one form, so spelling differences still match. */
const LETTER_FOLDS = new Map<string, string>([
  [ch(0x0623), ch(0x0627)], // alef with hamza above  -> alef
  [ch(0x0625), ch(0x0627)], // alef with hamza below  -> alef
  [ch(0x0622), ch(0x0627)], // alef with madda        -> alef
  [ch(0x0671), ch(0x0627)], // alef wasla             -> alef
  [ch(0x0629), ch(0x0647)], // taa marbuta            -> haa
  [ch(0x0649), ch(0x064a)], // alef maqsura           -> yaa
  [ch(0x06cc), ch(0x064a)], // Farsi yeh              -> yaa
  [ch(0x0626), ch(0x064a)], // yaa with hamza         -> yaa
  [ch(0x0624), ch(0x0648)], // waw with hamza         -> waw
  [ch(0x06a9), ch(0x0643)], // keheh                  -> kaf
]);
const LETTER_FOLD_RE = new RegExp(`[${[...LETTER_FOLDS.keys()].join('')}]`, 'g');

/**
 * Anything that is not a word character. Kept:
 *  U+0621–U+063A, U+0641–U+064A  Arabic letters (tatweel U+0640 excluded)
 *  U+0660–U+0669, U+06F0–U+06F9  Arabic-Indic digits
 *  A–Z, a–z, 0–9, U+00C0–U+024F  Latin, for future languages
 */
const NON_WORD = new RegExp(
  `[^${range(0x0621, 0x063a)}${range(0x0641, 0x064a)}${range(0x0660, 0x0669)}` +
    `${range(0x06f0, 0x06f9)}A-Za-z0-9${range(0x00c0, 0x024f)}]+`,
  'g',
);

/**
 * Builds the hidden search form of a text:
 * no tashkeel, folded letter variants, no punctuation, single spaces.
 *
 * Use the same function for the stored `SearchText` and for the user's query,
 * so both sides always match.
 */
export function toSearchText(text: string): string {
  return text
    .normalize('NFKC') // presentation forms and ligatures to plain letters
    .replace(MARKS, '')
    .replace(LETTER_FOLD_RE, (c) => LETTER_FOLDS.get(c) ?? c)
    .replace(NON_WORD, ' ')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/** U+064B–U+0652: tanween, harakat, shadda, sukun. */
const TASHKEEL = new RegExp(`[${range(0x064b, 0x0652)}]`);

/** True if the text contains at least one tashkeel mark. */
export function hasTashkeel(text: string): boolean {
  return TASHKEEL.test(text);
}
