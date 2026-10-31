/**
 * The message library of Adwamuha (`content-source/adwamuha-messages.json`): verses, hadiths and
 * athar shown at the owner's moments (a ward done, end of a week, …), picked at random. Nothing is
 * typed by hand: verses are cut from the Tanzil Quran text, hadiths and athar from Dorar pages
 * saved by `scripts/dorar` (receiver + browser helpers). Every entry starts as a "candidate"; only
 * the ones the owner approves ship.
 *
 *   node scripts/adwamuha/messages.ts verse 2:152 wardDone,bothDone [--note "…"] [--tanzil <dir>]
 *   node scripts/adwamuha/messages.ts verse 33:41-42 newStep
 *   node scripts/adwamuha/messages.ts dorar <page.json> weekBelow [--athar] [--note "…"]
 *   node scripts/adwamuha/messages.ts status <id,…> approved|rejected|candidate
 *   node scripts/adwamuha/messages.ts review          write docs/adwamuha/messages-for-review.md
 *   node scripts/adwamuha/messages.ts check           fail if the library is not valid
 *
 * The Tanzil files (`quran-uthmani.txt`, `quran-data.xml`) are downloaded from tanzil.net into
 * `.local/tanzil/` (not in git). Tanzil's terms: the text is copied verbatim, and the app names
 * Tanzil Project with a link to tanzil.net.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { ContentMessage, DorarHadith } from '../content/lib/types.ts';
import { type SavedPage, hadithFromPage } from '../dorar/lib.ts';

export const MOMENTS = [
  'wardDone',
  'bothDone',
  'weekReached',
  'weekBelow',
  'extended',
  'newStep',
  'afterStepBack',
  'finished',
] as const;
export type Moment = (typeof MOMENTS)[number];

export interface LibraryVerse {
  sura: number;
  /** Cut from Tanzil's quran-data.xml. */
  suraName: string;
  from: number;
  to: number;
  /** One text per verse, verbatim from Tanzil. */
  texts: string[];
}

export interface LibraryMessage {
  id: string;
  kind: 'verse' | 'hadith' | 'athar';
  moments: Moment[];
  status: 'candidate' | 'approved' | 'rejected';
  /** Claude's note for the owner: why it fits, or a caveat. */
  note?: string;
  verse?: LibraryVerse;
  hadith?: DorarHadith;
  addedOn: string;
}

export interface MessageLibrary {
  about: string;
  tanzil: { version: string; sha256: string } | null;
  messages: LibraryMessage[];
}

/** From the repo's root folder. */
export const LIBRARY_FILE = join('content-source', 'adwamuha-messages.json');
export const REVIEW_FILE = join('docs', 'adwamuha', 'messages-for-review.md');
const TANZIL_DIR = join('.local', 'tanzil');

const ABOUT =
  'The message library of Adwamuha. Verses: cut from the Tanzil Quran text (tanzil.net, CC BY 3.0, ' +
  'copied verbatim). Hadiths and athar: Dorar pages saved by scripts/dorar. Written only by ' +
  'scripts/adwamuha/messages.ts. Only "approved" entries ship; the owner approves each one.';

// ---------------------------------------------------------------- Tanzil

export interface Tanzil {
  version: string;
  sha256: string;
  verse(sura: number, aya: number): string | undefined;
  suraName(sura: number): string | undefined;
}

/** Reads Tanzil's text (format "sura|aya|text") and metadata (surah names). */
export function parseTanzil(text: string, metadataXml: string): Tanzil {
  const verses = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^(\d+)\|(\d+)\|(.+)$/.exec(line);
    if (m) verses.set(`${m[1]}:${m[2]}`, m[3]!);
  }
  const version = /^#\s*(Tanzil Quran Text \([^)]+\))/m.exec(text)?.[1];
  if (!version) throw new Error('Not a Tanzil text file (no copyright block)');
  const names = new Map<number, string>();
  for (const m of metadataXml.matchAll(/<sura index="(\d+)"[^>]* name="([^"]+)"/g)) {
    names.set(Number(m[1]), m[2]!);
  }
  return {
    version,
    sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
    verse: (sura, aya) => verses.get(`${sura}:${aya}`),
    suraName: (sura) => names.get(sura),
  };
}

export function loadTanzil(dir: string): Tanzil {
  return parseTanzil(
    readFileSync(join(dir, 'quran-uthmani.txt'), 'utf8'),
    readFileSync(join(dir, 'quran-data.xml'), 'utf8'),
  );
}

/** "2:152" or "33:41-42" → a verse entry cut from Tanzil. */
export function verseFromTanzil(tanzil: Tanzil, ref: string): LibraryVerse {
  const m = /^(\d+):(\d+)(?:-(\d+))?$/.exec(ref);
  if (!m) throw new Error(`Not a verse reference: ${ref} (use 2:152 or 33:41-42)`);
  const sura = Number(m[1]);
  const from = Number(m[2]);
  const to = Number(m[3] ?? m[2]);
  if (to < from || to - from > 4) throw new Error(`Use 1 to 5 verses in order: ${ref}`);
  const suraName = tanzil.suraName(sura);
  if (!suraName) throw new Error(`No surah ${sura}`);
  const texts: string[] = [];
  for (let aya = from; aya <= to; aya++) {
    const t = tanzil.verse(sura, aya);
    if (!t) throw new Error(`No verse ${sura}:${aya}`);
    texts.push(t);
  }
  return { sura, suraName, from, to, texts };
}

// ---------------------------------------------------------------- the library

export function parseMoments(list: string): Moment[] {
  const moments = list.split(',').map((s) => s.trim());
  for (const m of moments) {
    if (!(MOMENTS as readonly string[]).includes(m)) {
      throw new Error(`Unknown moment "${m}". Use: ${MOMENTS.join(', ')}`);
    }
  }
  return moments as Moment[];
}

export const verseId = (v: LibraryVerse) =>
  `q${v.sura}-${v.from}${v.to === v.from ? '' : `-${v.to}`}`;

/** "https://dorar.net/h/ZDH7AalJ" → "d-ZDH7AalJ". */
export const dorarId = (url: string) =>
  'd-' +
  url
    .replace(/^https:\/\/(www\.)?dorar\.net\//, '')
    .replace(/^h\//, '')
    .replace(/[^\w-]/g, '-');

/**
 * The owner's rule: graded صحيح or حسن only. The word must stand alone: "أخرجه في صحيحه" or
 * "رجاله رجال الصحيح" are not gradings.
 */
const GOOD = /(^|[^\p{L}])(صحيح|حسن)([^\p{L}]|$)/u;
const WEAK = /ضعيف|موضوع|منكر|لا أصل|باطل|لا يصح|شاذ|منقطع|مرسل/;
export const isGoodGrading = (grading: string) => GOOD.test(grading) && !WEAK.test(grading);

export function checkLibrary(lib: MessageLibrary): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const m of lib.messages) {
    if (ids.has(m.id)) problems.push(`${m.id}: twice`);
    ids.add(m.id);
    if (m.moments.length === 0) problems.push(`${m.id}: no moment`);
    for (const x of m.moments) {
      if (!(MOMENTS as readonly string[]).includes(x)) problems.push(`${m.id}: moment ${x}`);
    }
    if (!['candidate', 'approved', 'rejected'].includes(m.status)) {
      problems.push(`${m.id}: status ${m.status}`);
    }
    if (m.kind === 'verse') {
      if (!m.verse || m.verse.texts.length !== m.verse.to - m.verse.from + 1) {
        problems.push(`${m.id}: verse texts`);
      } else if (verseId(m.verse) !== m.id) problems.push(`${m.id}: id does not match the verse`);
      if (!lib.tanzil) problems.push(`${m.id}: no Tanzil version recorded`);
    } else {
      const h = m.hadith;
      if (!h) problems.push(`${m.id}: no hadith`);
      else {
        if (dorarId(h.url) !== m.id) problems.push(`${m.id}: id does not match the link`);
        if (!isGoodGrading(h.grading)) {
          problems.push(`${m.id}: grading "${h.grading}" is not صحيح or حسن`);
        }
        if (!h.text || !h.muhaddith || !h.book) problems.push(`${m.id}: missing fields`);
      }
    }
  }
  return problems;
}

/** What ships in the content database: the approved entries only (the build fails if any is invalid). */
export function shippedMessages(lib: MessageLibrary, lang: string): ContentMessage[] {
  const problems = checkLibrary(lib);
  if (problems.length) throw new Error(`${LIBRARY_FILE} is not valid:\n${problems.join('\n')}`);
  return lib.messages
    .filter((m) => m.status === 'approved')
    .map((m) => ({
      lang,
      id: m.id,
      kind: m.kind,
      moments: [...m.moments],
      text: m.verse ? m.verse.texts.join('\n') : m.hadith!.text,
      verse: m.verse
        ? { sura: m.verse.sura, suraName: m.verse.suraName, from: m.verse.from, to: m.verse.to }
        : null,
      hadith: m.hadith
        ? {
            rawi: m.hadith.rawi,
            muhaddith: m.hadith.muhaddith,
            book: m.hadith.book,
            number: m.hadith.number,
            grading: m.hadith.grading,
            dorarUrl: m.hadith.url,
          }
        : null,
    }));
}

export function addMessage(lib: MessageLibrary, msg: LibraryMessage): void {
  const old = lib.messages.findIndex((m) => m.id === msg.id);
  if (old >= 0) {
    // Adding again changes the moments and the note; the owner's status stays.
    lib.messages[old] = { ...msg, status: lib.messages[old]!.status };
  } else lib.messages.push(msg);
}

// ---------------------------------------------------------------- the review page

const KIND_NAME = { verse: 'Verse', hadith: 'Hadith', athar: 'Athar' } as const;

export function renderReview(lib: MessageLibrary): string {
  const counts = MOMENTS.map((moment) => {
    const of = lib.messages.filter((m) => m.status !== 'rejected' && m.moments.includes(moment));
    const approved = of.filter((m) => m.status === 'approved').length;
    return `| \`${moment}\` | ${of.length} | ${approved} |`;
  });
  const lines = [
    "# Adwamuha — the message library, for the owner's review",
    '',
    'Generated by `scripts/adwamuha/messages.ts review` from `content-source/adwamuha-messages.json`.',
    'Every text is cut by script: verses from the Tanzil Quran text, hadiths and athar from saved',
    'Dorar pages. Say which ones to approve, change the moments of, or remove. Your own messages',
    '(one per moment, from your description) stay in the library too.',
    '',
    lib.tanzil ? `Quran text: ${lib.tanzil.version}, tanzil.net.` : '',
    '',
    '| Moment | Candidates + approved | Approved |',
    '|---|---|---|',
    ...counts,
    '',
  ];
  for (const m of lib.messages) {
    lines.push(`## ${m.id} · ${KIND_NAME[m.kind]} · ${m.status}`, '');
    lines.push(`Moments: ${m.moments.map((x) => `\`${x}\``).join(', ')}`, '');
    if (m.verse) {
      const v = m.verse;
      lines.push(...v.texts.map((t) => `> ${t}`), '');
      const ref = v.to === v.from ? `${v.from}` : `${v.from}–${v.to}`;
      lines.push(`[${v.suraName}: ${ref}]`, '');
    }
    if (m.hadith) {
      const h = m.hadith;
      lines.push(`> ${h.text}`, '');
      lines.push(
        `${h.rawi ? `الراوي: ${h.rawi} · ` : ''}المحدث: ${h.muhaddith} · المصدر: ${h.book}` +
          `${h.number ? ` · الرقم: ${h.number}` : ''} · الحكم: ${h.grading}`,
        '',
        h.url,
        '',
      );
    }
    if (m.note) lines.push(`Note: ${m.note}`, '');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------- the command line

function main(root: string, argv: string[]): void {
  const libraryFile = join(root, LIBRARY_FILE);
  const readLibrary = (): MessageLibrary =>
    existsSync(libraryFile)
      ? (JSON.parse(readFileSync(libraryFile, 'utf8')) as MessageLibrary)
      : { about: ABOUT, tanzil: null, messages: [] };
  const writeLibrary = (lib: MessageLibrary): void => {
    const problems = checkLibrary(lib);
    if (problems.length) throw new Error(`Not saved:\n${problems.join('\n')}`);
    writeFileSync(libraryFile, JSON.stringify(lib, null, 2) + '\n');
  };
  const args = [...argv];
  const flag = (name: string): string | undefined => {
    const i = args.indexOf(name);
    if (i === -1) return undefined;
    const v = args[i + 1];
    if (v === undefined) throw new Error(`${name} needs a value`);
    args.splice(i, 2);
    return v;
  };
  const has = (name: string): boolean => {
    const i = args.indexOf(name);
    if (i !== -1) args.splice(i, 1);
    return i !== -1;
  };
  const note = flag('--note');
  const tanzilDir = flag('--tanzil');
  const athar = has('--athar');
  const [command, a, b] = args;
  const lib = readLibrary();
  const addedOn = new Date().toISOString().slice(0, 10);

  if (command === 'verse' && a && b) {
    const tanzil = loadTanzil(tanzilDir ?? join(root, TANZIL_DIR));
    if (lib.tanzil && lib.tanzil.sha256 !== tanzil.sha256) {
      throw new Error('This Tanzil file differs from the one used before: check its version');
    }
    lib.tanzil = { version: tanzil.version, sha256: tanzil.sha256 };
    const verse = verseFromTanzil(tanzil, a);
    const id = verseId(verse);
    addMessage(lib, {
      id,
      kind: 'verse',
      moments: parseMoments(b),
      status: 'candidate',
      note,
      verse,
      addedOn,
    });
    writeLibrary(lib);
    console.log(`${id}: ${verse.suraName} ${a}`);
  } else if (command === 'dorar' && a && b) {
    const hadith = hadithFromPage(JSON.parse(readFileSync(a, 'utf8')) as SavedPage);
    const id = dorarId(hadith.url);
    const kind = athar ? 'athar' : 'hadith';
    addMessage(lib, {
      id,
      kind,
      moments: parseMoments(b),
      status: 'candidate',
      note,
      hadith,
      addedOn,
    });
    writeLibrary(lib);
    console.log(`${id}: ${hadith.book} ${hadith.number} (${hadith.grading})`);
  } else if (command === 'status' && a && b) {
    if (!['approved', 'rejected', 'candidate'].includes(b)) throw new Error(`Unknown status ${b}`);
    for (const id of a.split(',')) {
      const m = lib.messages.find((x) => x.id === id);
      if (!m) throw new Error(`No message ${id}`);
      m.status = b as LibraryMessage['status'];
    }
    writeLibrary(lib);
  } else if (command === 'review') {
    writeFileSync(join(root, REVIEW_FILE), renderReview(lib));
    console.log(`Wrote ${REVIEW_FILE} (${lib.messages.length} messages)`);
  } else if (command === 'check') {
    const problems = checkLibrary(lib);
    if (problems.length) {
      console.error(problems.join('\n'));
      process.exit(1);
    }
    console.log(`${lib.messages.length} messages, all valid`);
  } else {
    console.error(readFileSync(process.argv[1]!, 'utf8').split('*/')[0]);
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('messages.ts')) {
  main(join(dirname(process.argv[1]), '..', '..'), process.argv.slice(2));
}
