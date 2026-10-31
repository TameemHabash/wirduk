import { cleanDisplayText } from '../../../src/text/normalize.ts';

import { addLineBreaks } from './line-breaks.ts';
import { removeDoubleParens } from './quote-marks.ts';
import { applyApprovedWording, buildSources } from './sources.ts';
import type {
  AudioManifest,
  ChangeLogEntry,
  ContentAudioFile,
  ContentCategory,
  ContentDhikr,
  ContentModel,
  DorarSources,
  Overrides,
  SourceCategory,
} from './types.ts';

/** Language of the source content. */
export const SOURCE_LANG = 'ar';

/**
 * Stable global dhikr id: `categoryId * 1000 + position in the source category`.
 * Source dhikr ids are only unique inside their category. User data (and later
 * Dorar sources) reference these ids, so the formula must never change.
 */
export function makeDhikrId(categoryId: number, sourceDhikrId: number): number {
  if (!Number.isInteger(sourceDhikrId) || sourceDhikrId < 1 || sourceDhikrId > 999) {
    throw new Error(`Dhikr id out of range: ${categoryId}:${sourceDhikrId}`);
  }
  return categoryId * 1000 + sourceDhikrId;
}

function fail(message: string): never {
  throw new Error(`[content] ${message}`);
}

/** Checks the raw source before anything is changed. */
export function validateSource(source: SourceCategory[]): void {
  const catIds = new Set<number>();
  for (const cat of source) {
    if (!Number.isInteger(cat.id) || cat.id < 1) fail(`Bad category id: ${cat.id}`);
    if (catIds.has(cat.id)) fail(`Duplicate category id: ${cat.id}`);
    catIds.add(cat.id);
    if (!cat.category?.trim()) fail(`Empty title in category ${cat.id}`);
    if (!Array.isArray(cat.array) || cat.array.length === 0)
      fail(`No adhkar in category ${cat.id}`);
    const ids = new Set<number>();
    for (const d of cat.array) {
      if (ids.has(d.id)) fail(`Duplicate dhikr id ${cat.id}:${d.id}`);
      ids.add(d.id);
      if (!d.text?.trim()) fail(`Empty text in ${cat.id}:${d.id}`);
      if (!Number.isInteger(d.count) || d.count < 1) fail(`Bad count in ${cat.id}:${d.id}`);
    }
  }
}

/** Deep copy, so the caller's source is never mutated. */
function cloneSource(source: SourceCategory[]): SourceCategory[] {
  return JSON.parse(JSON.stringify(source)) as SourceCategory[];
}

function replaceOnce(
  text: string,
  find: string,
  replace: string,
  where: string,
): { text: string; at: number } {
  const at = text.indexOf(find);
  if (at === -1) fail(`Text fix not found at ${where}: "${find}"`);
  if (text.indexOf(find, at + find.length) !== -1) {
    fail(`Text fix is ambiguous (found twice) at ${where}: "${find}"`);
  }
  return { text: text.slice(0, at) + replace + text.slice(at + find.length), at };
}

/** The whole words around position `at`, so a change can be read in context. */
export function contextSnippet(text: string, at: number, length: number, around = 20): string {
  const isSpace = (i: number) => /\s/.test(text[i] ?? ' ');
  let start = Math.max(0, at - around);
  let end = Math.min(text.length, at + length + around);
  // Only grow a cut that falls inside a word.
  while (start > 0 && !isSpace(start) && !isSpace(start - 1)) start--;
  while (end < text.length && !isSpace(end - 1) && !isSpace(end)) end++;
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** Applies count and text fixes. Each fix must match the source exactly. */
function applyFixes(source: SourceCategory[], overrides: Overrides, changes: ChangeLogEntry[]) {
  const findCat = (id: number) => source.find((c) => c.id === id) ?? fail(`No category ${id}`);
  const findDhikr = (catId: number, id: number) =>
    findCat(catId).array.find((d) => d.id === id) ?? fail(`No dhikr ${catId}:${id}`);

  for (const fix of overrides.countFixes) {
    const where = `${fix.categoryId}:${fix.dhikrId}`;
    const d = findDhikr(fix.categoryId, fix.dhikrId);
    if (d.count !== fix.from) {
      fail(`Count fix at ${where} expects ${fix.from} but the source has ${d.count}`);
    }
    d.count = fix.to;
    changes.push({ kind: 'count', where, detail: `${fix.from} → ${fix.to}. ${fix.reason}` });
  }

  for (const fix of overrides.textFixes) {
    if (fix.target === 'title') {
      const cat = findCat(fix.categoryId);
      const where = `category ${fix.categoryId}`;
      const before = cat.category.trim();
      cat.category = replaceOnce(cat.category, fix.find, fix.replace, where).text;
      changes.push({
        kind: 'title',
        where,
        detail: `"${before}" → "${cat.category.trim()}". ${fix.reason} (${fix.evidence})`,
      });
    } else {
      if (fix.dhikrId == null) fail(`Text fix in category ${fix.categoryId} has no dhikrId`);
      const d = findDhikr(fix.categoryId, fix.dhikrId);
      const where = `${fix.categoryId}:${fix.dhikrId}`;
      const original = d.text;
      const { text, at } = replaceOnce(d.text, fix.find, fix.replace, where);
      d.text = text;
      const before = contextSnippet(original, at, fix.find.length);
      const after = contextSnippet(text, at, fix.replace.length);
      changes.push({
        kind: 'text',
        where,
        detail: `"${before}" → "${after}". ${fix.reason} (${fix.evidence})`,
      });
    }
  }
}

/** Drops the book's (( )) quote marks from every dhikr (owner decision, see quote-marks.ts). */
function removeQuoteMarks(
  adhkar: ContentDhikr[],
  overrides: Overrides,
  lang: string,
  changes: ChangeLogEntry[],
) {
  const rule = overrides.removeQuoteMarks;
  if (!rule) return;
  let changed = 0;
  for (const a of adhkar) {
    const text = a.texts[lang];
    if (text === undefined) continue;
    const next = removeDoubleParens(text);
    if (next !== text) {
      a.texts[lang] = next;
      changed++;
    }
  }
  changes.push({
    kind: 'quote-marks',
    where: 'every dhikr',
    detail: `Removed from ${changed} adhkar. ${rule.reason} (${rule.evidence})`,
  });
}

/** Each part of a long dhikr on its own line (owner decision, see line-breaks.ts). */
function breakIntoParts(
  adhkar: ContentDhikr[],
  overrides: Overrides,
  lang: string,
  changes: ChangeLogEntry[],
) {
  const rule = overrides.lineBreaks;
  if (!rule) return;
  for (const id of rule.stepListIds) {
    if (!adhkar.some((a) => a.id === id)) fail(`Line breaks: no dhikr ${id} for a step list`);
  }
  const changed: number[] = [];
  for (const a of adhkar) {
    const text = a.texts[lang];
    if (text === undefined) continue;
    const next = addLineBreaks(text, { stepList: rule.stepListIds.includes(a.id) });
    if (next !== text) {
      a.texts[lang] = next;
      changed.push(a.id);
    }
  }
  changes.push({
    kind: 'line-breaks',
    where: changed.join(', ') || 'none',
    detail: `${rule.reason} (${rule.evidence})`,
  });
}

/**
 * Recordings that say the dhikr more than once (owner's words): file → times.
 * Each listed file must be used, and every dhikr using it must have a count
 * that divides evenly (e.g. count 100, said 4 times per recording: 25 plays).
 */
function audioRepeats(
  adhkar: readonly ContentDhikr[],
  usedAudio: ReadonlySet<string>,
  overrides: Overrides,
  changes: ChangeLogEntry[],
): Map<string, number> {
  const rule = overrides.audioRepeats;
  const result = new Map<string, number>();
  if (!rule) return result;
  for (const [file, times] of Object.entries(rule.files)) {
    if (!Number.isInteger(times) || times < 1) {
      fail(`Audio repeats for "${file}" must be a whole number of 1 or more, got ${times}`);
    }
    if (!usedAudio.has(file)) fail(`Audio repeats: no dhikr uses the recording "${file}"`);
    const users = adhkar.filter((a) => a.audioFile === file);
    for (const a of users) {
      if (a.count % times !== 0) {
        fail(
          `Audio repeats: dhikr ${a.id} has count ${a.count}, which the recording "${file}" ` +
            `(said ${times} times) cannot divide evenly`,
        );
      }
    }
    if (times === 1) continue;
    result.set(file, times);
    changes.push({
      kind: 'audio-repeats',
      where: users.map((a) => a.id).join(', '),
      detail:
        `Recording "${file}" says the dhikr ${times} times: it plays ` +
        `${users.map((a) => `${a.count / times}× for count ${a.count}`).join(', ')}. ${rule.reason}`,
    });
  }
  return result;
}

/**
 * The owner's own recordings (milestone 11), in place of the book's: each listed dhikr plays
 * its new file. The ids must exist and the files must be in the manifest.
 */
function applyRecordings(
  adhkar: ContentDhikr[],
  overrides: Overrides,
  audioBytes: ReadonlyMap<string, number>,
  changes: ChangeLogEntry[],
) {
  const rule = overrides.audioRecordings;
  if (!rule) return;
  const byFile = new Map<string, number[]>();
  for (const [id, file] of Object.entries(rule.adhkar)) {
    const dhikr = adhkar.find((a) => a.id === Number(id));
    if (!dhikr) fail(`Audio recordings: no dhikr ${id}`);
    if (!audioBytes.has(file))
      fail(`Audio recordings: "${file}" (dhikr ${id}) is not in the manifest`);
    dhikr.audioFile = file;
    byFile.set(file, [...(byFile.get(file) ?? []), dhikr.id]);
  }
  for (const [file, ids] of byFile) {
    changes.push({
      kind: 'audio-recordings',
      where: ids.join(', '),
      detail: `Plays the owner's recording "${file}". ${rule.reason} (${rule.sheet})`,
    });
  }
}

/** The owner's own adhkar (not in the book), placed first in their categories. */
function addOwnerAdhkar(
  adhkar: ContentDhikr[],
  categories: readonly ContentCategory[],
  overrides: Overrides,
  lang: string,
  changes: ChangeLogEntry[],
) {
  for (const add of overrides.addedAdhkar ?? []) {
    if (add.position !== 'first') fail(`Added dhikr ${add.dhikrId}: unknown position`);
    if (add.dhikrId < 900) fail(`Added dhikr ids start at 900 (got ${add.dhikrId})`);
    if (!Number.isInteger(add.count) || add.count < 1)
      fail(`Added dhikr ${add.dhikrId}: bad count`);
    const raw = add.texts[lang] ?? fail(`Added dhikr ${add.dhikrId} has no "${lang}" text`);
    const text = cleanDisplayText(raw).trim();
    if (!text) fail(`Added dhikr ${add.dhikrId} has an empty text`);
    for (const categoryId of add.categoryIds) {
      if (!categories.some((c) => c.id === categoryId)) {
        fail(`Added dhikr ${add.dhikrId}: no category ${categoryId}`);
      }
      const id = makeDhikrId(categoryId, add.dhikrId);
      const first = adhkar.findIndex((a) => a.categoryId === categoryId);
      adhkar.splice(first === -1 ? adhkar.length : first, 0, {
        id,
        categoryId,
        sortOrder: 0,
        count: add.count,
        audioFile: null,
        texts: { [lang]: text },
      });
      let n = 0;
      for (const a of adhkar) if (a.categoryId === categoryId) a.sortOrder = ++n;
      changes.push({
        kind: 'added',
        where: `dhikr ${id}`,
        detail: `"${text}", first in category ${categoryId}. ${add.reason} (${add.evidence})`,
      });
    }
  }
}

/** cleanDisplayText + trim, with a log entry when letters changed. */
function clean(text: string, where: string, changes: ChangeLogEntry[]): string {
  const cleaned = cleanDisplayText(text);
  if (cleaned !== text) {
    changes.push({
      kind: 'cleanup',
      where,
      detail: `PDF letter-shape characters replaced by normal letters: "${text.trim()}" → "${cleaned.trim()}"`,
    });
  }
  return cleaned.trim();
}

/**
 * Turns the source JSON into the content model:
 * fixes → cleanup → category splits → stable ids and sort order.
 */
export function transformContent(
  sourceInput: SourceCategory[],
  overrides: Overrides,
  manifest: AudioManifest,
  dorar: DorarSources = { lang: SOURCE_LANG, retrievedOn: '', entries: [] },
): ContentModel {
  validateSource(sourceInput);
  const source = cloneSource(sourceInput);
  const changes: ChangeLogEntry[] = [];
  const lang = SOURCE_LANG;

  applyFixes(source, overrides, changes);

  const audioBytes = new Map(manifest.files.map((f) => [f.file, f.bytes]));
  if (manifest.lang !== lang) fail(`Audio manifest is for "${manifest.lang}", expected "${lang}"`);

  const splits = new Map(overrides.categorySplits.map((s) => [s.sourceCategoryId, s]));
  for (const id of splits.keys()) {
    if (!source.some((c) => c.id === id)) fail(`Split refers to missing category ${id}`);
  }

  const categories: ContentCategory[] = [];
  const adhkar: ContentDhikr[] = [];
  const usedAudio = new Set<string>();

  const addDhikr = (
    categoryId: number,
    sourceId: number,
    count: number,
    text: string,
    file: string,
  ) => {
    let audioFile: string | null = null;
    if (file) {
      if (!audioBytes.has(file))
        fail(`Audio file "${file}" (${categoryId}:${sourceId}) is not in the manifest`);
      audioFile = file;
      usedAudio.add(file);
    }
    adhkar.push({
      id: makeDhikrId(categoryId, sourceId),
      categoryId,
      sortOrder: adhkar.filter((a) => a.categoryId === categoryId).length + 1,
      count,
      audioFile,
      texts: { [lang]: text },
    });
  };

  for (const cat of source) {
    const title = clean(cat.category, `category ${cat.id} title`, changes);
    const split = splits.get(cat.id);

    if (!split) {
      categories.push({
        id: cat.id,
        sortOrder: categories.length + 1,
        audioFile: cat.filename || null,
        titles: { [lang]: title },
      });
      for (const d of cat.array) {
        addDhikr(cat.id, d.id, d.count, clean(d.text, `${cat.id}:${d.id}`, changes), d.filename);
      }
      continue;
    }

    changes.push({
      kind: 'split',
      where: `category ${cat.id}`,
      detail: `"${title}" split into ${split.parts
        .map((p) => `${p.id} "${p.titles[lang]}"`)
        .join(' and ')}. ${split.reason}`,
    });

    for (const part of split.parts) {
      const partTitle = part.titles[lang] ?? fail(`Split part ${part.id} has no "${lang}" title`);
      categories.push({
        id: part.id,
        sortOrder: categories.length + 1,
        audioFile: cat.filename || null,
        titles: { [lang]: partTitle },
      });
      const patterns = part.removePatterns.map((p) => new RegExp(p, 'g'));
      const partFixes = part.textFixes ?? [];
      for (const fix of partFixes) {
        if (!cat.array.some((d) => d.id === fix.dhikrId)) {
          fail(`Text fix for category ${part.id} refers to missing dhikr ${cat.id}:${fix.dhikrId}`);
        }
        if (part.excludeDhikr.includes(fix.dhikrId)) {
          fail(
            `Text fix for category ${part.id} refers to excluded dhikr ${cat.id}:${fix.dhikrId}`,
          );
        }
      }

      for (const d of cat.array) {
        const where = `${cat.id}:${d.id} in category ${part.id}`;
        if (part.excludeDhikr.includes(d.id)) {
          changes.push({ kind: 'exclude', where, detail: part.excludeReason ?? 'Excluded.' });
          continue;
        }
        let text = clean(d.text, `${cat.id}:${d.id}`, changes);
        for (const fix of partFixes.filter((f) => f.dhikrId === d.id)) {
          const original = text;
          const replaced = replaceOnce(text, fix.find, fix.replace, where);
          text = replaced.text;
          changes.push({
            kind: 'text',
            where,
            detail:
              `"${contextSnippet(original, replaced.at, fix.find.length)}" → ` +
              `"${contextSnippet(text, replaced.at, fix.replace.length)}". ${fix.reason} (${fix.evidence})`,
          });
        }
        const before = text;
        for (const re of patterns) text = text.replace(re, '');
        text = text.trim();
        if (text !== before) {
          changes.push({
            kind: 'remove-notes',
            where,
            detail: part.removeReason ?? 'Notes removed.',
          });
        }
        addDhikr(part.id, d.id, d.count, text, d.filename);
      }
    }
  }

  applyApprovedWording(adhkar, dorar, lang, changes);
  removeQuoteMarks(adhkar, overrides, lang, changes);
  breakIntoParts(adhkar, overrides, lang, changes);
  addOwnerAdhkar(adhkar, categories, overrides, lang, changes);

  // Integrity checks on the result.
  const catIds = new Set<number>();
  for (const c of categories) {
    if (catIds.has(c.id)) fail(`Duplicate category id after splits: ${c.id}`);
    catIds.add(c.id);
    if (!adhkar.some((a) => a.categoryId === c.id)) fail(`Category ${c.id} has no adhkar`);
  }
  const dhikrIds = new Set<number>();
  for (const a of adhkar) {
    if (dhikrIds.has(a.id)) fail(`Duplicate dhikr id: ${a.id}`);
    dhikrIds.add(a.id);
  }

  // The owner's recordings replace the book's; a book recording no dhikr plays any more is
  // left out of the content.
  applyRecordings(adhkar, overrides, audioBytes, changes);
  usedAudio.clear();
  for (const a of adhkar) if (a.audioFile) usedAudio.add(a.audioFile);

  const repeats = audioRepeats(adhkar, usedAudio, overrides, changes);
  const audioFiles: ContentAudioFile[] = [...usedAudio].sort().map((fileName) => ({
    lang,
    fileName,
    bytes: audioBytes.get(fileName) ?? fail(`No size for ${fileName}`),
    repeats: repeats.get(fileName) ?? 1,
  }));

  const sources = buildSources(adhkar, dorar, lang);

  return { categories, adhkar, audioFiles, changes, sources };
}
