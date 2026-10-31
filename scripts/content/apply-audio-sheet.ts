/**
 * Pulls the owner's new recordings from their sheet (milestone 11,
 * docs/audio/morning-evening-audio.csv, filled by the owner): checks each row
 * (the file exists and is an m4a or mp3; `new_recording_says` divides the
 * count), copies the file into the audio site's folder named after the dhikr
 * (`1001.m4a`; a file used by two rows is copied once), and writes the dhikr →
 * file map and the repeats into content-source/overrides.json. A row with no
 * file keeps its recording. The files are copied as they are (an m4a is not
 * converted: converting would lose quality).
 *
 *   node scripts/content/apply-audio-sheet.ts <audio-site-folder> [--dry-run]
 *   e.g. node scripts/content/apply-audio-sheet.ts ../wirduk-audio/audio/ar
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';

import { SHEET_FILE } from './audio-sheet.ts';
import type { Overrides } from './lib/types.ts';

/** CSV as Excel saves it: quoted fields may hold commas, line breaks and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (quoted) {
      if (c !== '"') field += c;
      else if (s[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) rows.push([...row, field]);
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export interface SheetRecording {
  /** The sheet's row numbers that use this file. */
  rows: number[];
  source: string;
  /** Its name on the audio site. */
  name: string;
  /** Times one play says the dhikr. */
  says: number;
  ids: number[];
}

/** The owner's rows as recordings to publish; throws on the first problem, with its row. */
export function readSheet(csv: string, fileExists: (path: string) => boolean): SheetRecording[] {
  const [header, ...lines] = parseCsv(csv);
  const at = (name: string) => {
    const i = header!.indexOf(name);
    if (i < 0) throw new Error(`The sheet has no "${name}" column`);
    return i;
  };
  const col = {
    row: at('row'),
    morning: at('morning_id'),
    evening: at('evening_id'),
    count: at('count'),
    path: at('new_file_path'),
    says: at('new_recording_says'),
  };
  const bySource = new Map<string, SheetRecording>();
  for (const line of lines) {
    const row = Number(line[col.row]);
    // The owner's paths may carry quotes from Excel: "D:\…\1.m4a".
    const source = (line[col.path] ?? '')
      .trim()
      .replace(/^"+|"+$/g, '')
      .trim();
    if (!source) continue;
    const ids = [line[col.morning], line[col.evening]].filter((v) => v?.trim()).map(Number);
    const count = Number(line[col.count]);
    const says = Number((line[col.says] ?? '').trim() || '1');
    const ext = extname(source).toLowerCase();
    if (ids.length === 0 || ids.some((id) => !Number.isInteger(id))) {
      throw new Error(`Row ${row}: no dhikr id`);
    }
    if (ext !== '.m4a' && ext !== '.mp3')
      throw new Error(`Row ${row}: not an m4a or mp3 file: ${source}`);
    if (!fileExists(source)) throw new Error(`Row ${row}: the file is not there: ${source}`);
    if (!Number.isInteger(says) || says < 1 || count % says !== 0) {
      throw new Error(
        `Row ${row}: a recording that says it ${says} times cannot divide the count ${count}`,
      );
    }
    const key = source.toLowerCase();
    const known = bySource.get(key);
    if (known) {
      if (known.says !== says)
        throw new Error(
          `Row ${row}: the same file says it ${known.says} times in row ${known.rows[0]}`,
        );
      known.rows.push(row);
      known.ids.push(...ids);
    } else {
      // mp3 names have no extension in the content (the book's style); others keep theirs.
      const name = ext === '.mp3' ? String(ids[0]) : `${ids[0]}${ext}`;
      bySource.set(key, { rows: [row], source, name, says, ids: [...ids] });
    }
  }
  return [...bySource.values()];
}

/** The overrides with the recordings in place of the book's (the repeats of other files kept). */
export function withRecordings(
  overrides: Overrides,
  recordings: SheetRecording[],
  sheet: string,
): Overrides {
  const adhkar: Record<string, string> = {};
  for (const r of recordings) for (const id of r.ids) adhkar[String(id)] = r.name;
  const sorted = Object.fromEntries(
    Object.entries(adhkar).sort(([a], [b]) => Number(a) - Number(b)),
  );
  const files = { ...(overrides.audioRepeats?.files ?? {}) };
  for (const r of recordings) {
    if (r.says > 1) files[r.name] = r.says;
    else delete files[r.name];
  }
  return {
    ...overrides,
    audioRepeats: {
      reason:
        overrides.audioRepeats?.reason ?? 'How many times the dhikr is said in one recording.',
      files,
    },
    audioRecordings: {
      reason:
        "The owner's own recordings of the morning and evening adhkar (milestone 11, " +
        "2026-10-31), as recorded (m4a, not converted); a dhikr not listed plays the book's.",
      sheet,
      adhkar: sorted,
    },
  };
}

if (basename(process.argv[1] ?? '') === 'apply-audio-sheet.ts') {
  const [siteDir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  if (!siteDir || !existsSync(siteDir)) {
    console.error(
      'Usage: node scripts/content/apply-audio-sheet.ts <audio-site-folder> [--dry-run]',
    );
    process.exit(1);
  }
  const ROOT = join(dirname(process.argv[1]!), '..', '..');
  const OVERRIDES_FILE = join(ROOT, 'content-source', 'overrides.json');
  const recordings = readSheet(readFileSync(join(ROOT, SHEET_FILE), 'utf8'), existsSync);
  for (const r of recordings) {
    const target = join(siteDir, r.name);
    const same = existsSync(target) && readFileSync(target).equals(readFileSync(r.source));
    console.log(
      `rows ${r.rows.join('+').padEnd(6)} ${r.source} → ${r.name}` +
        `${r.says > 1 ? ` (says it ${r.says} times)` : ''} for ${r.ids.join(', ')}${same ? ' (already there)' : ''}`,
    );
    if (!dryRun && !same) copyFileSync(r.source, target);
  }
  if (!dryRun) {
    const overrides = JSON.parse(readFileSync(OVERRIDES_FILE, 'utf8')) as Overrides;
    const sheet = SHEET_FILE.replace(/\\/g, '/');
    writeFileSync(
      OVERRIDES_FILE,
      `${JSON.stringify(withRecordings(overrides, recordings, sheet), null, 2)}\n`,
    );
  }
  console.log(
    `${recordings.length} recordings${dryRun ? ' (dry run: nothing copied or written)' : ''}`,
  );
}
