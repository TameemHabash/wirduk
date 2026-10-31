/**
 * Writes the morning and evening adhkar as a sheet for the new recordings
 * (milestone 11, owner 2026-10-31): one row per recording needed, the morning
 * order first (one row when the evening says the same words), then the
 * adhkar said only in the evening (other words, or no morning one). The owner
 * fills `new_file_path` (where to copy the new file from) and
 * `new_recording_says` (times one play says the dhikr). All texts come from
 * the content database; nothing is typed.
 *
 *   node scripts/content/audio-sheet.ts   → docs/audio/morning-evening-audio.csv
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { audioFileName } from '../../src/features/audio/audio-plan.ts';

export const SHEET_FILE = join('docs', 'audio', 'morning-evening-audio.csv');
const MORNING = 1;
const EVENING = 133;
/** An evening dhikr's id is its morning one's + 132000 (1003 → 133003). */
const EVENING_OFFSET = 132_000;
const AUDIO_BASE = 'https://tameemhabash.github.io/wirduk-audio/audio/ar';

interface Dhikr {
  id: number;
  count: number;
  audioFile: string | null;
  repeats: number;
  text: string;
}

function readCategory(db: DatabaseSync, categoryId: number): Dhikr[] {
  return db
    .prepare(
      `SELECT a.Id AS id, a.Count AS count, a.AudioFile AS audioFile,
              COALESCE(af.Repeats, 1) AS repeats, t.Text AS text
         FROM Adhkar a JOIN DhikrTranslations t ON t.DhikrId = a.Id AND t.Lang = 'ar'
         LEFT JOIN AudioFiles af ON af.FileName = a.AudioFile AND af.Lang = 'ar'
        WHERE a.CategoryId = ? ORDER BY a.SortOrder`,
    )
    .all(categoryId) as unknown as Dhikr[];
}

const same = (a: string, b: string) => a.normalize('NFC') === b.normalize('NFC');

const HEADER = [
  'row',
  'section',
  'morning_id',
  'evening_id',
  'dhikr',
  'count',
  'current_file',
  'current_recording_says',
  'current_file_link',
  'new_file_path',
  'new_recording_says',
  'notes',
];

export function sheetRows(morning: Dhikr[], evening: Dhikr[]): string[][] {
  const eveningById = new Map(evening.map((d) => [d.id, d]));
  const morningIds = new Set(morning.map((d) => d.id));
  const rows: string[][] = [];
  const row = (section: string, m: Dhikr | null, e: Dhikr | null, notes: string[]) => {
    const d = (m ?? e)!;
    if (!d.audioFile) notes.push('No recording yet.');
    if (m && e && m.count !== e.count) notes.push(`Evening count is ${e.count}.`);
    rows.push([
      String(rows.length + 1),
      section,
      m ? String(m.id) : '',
      e ? String(e.id) : '',
      d.text.replace(/\s*\n\s*/g, ' '),
      String(d.count),
      d.audioFile ?? '',
      d.audioFile ? String(d.repeats) : '',
      d.audioFile ? `${AUDIO_BASE}/${encodeURIComponent(audioFileName(d.audioFile, 'mp3'))}` : '',
      '',
      '',
      notes.join(' '),
    ]);
  };

  // The morning order: one recording for both when the evening says the same words.
  for (const m of morning) {
    const e = eveningById.get(m.id + EVENING_OFFSET) ?? null;
    if (e && same(m.text, e.text)) {
      row('morning + evening', m, e, ['One recording for the morning and the evening.']);
    } else if (e) {
      row('morning', m, null, [`The evening says other words: its own row at the end (${e.id}).`]);
    } else {
      row('morning only', m, null, ['Said only in the morning.']);
    }
  }
  // Then what is said only in the evening.
  for (const e of evening) {
    const morningId = e.id - EVENING_OFFSET;
    if (!morningIds.has(morningId)) {
      row('evening only', null, e, ['Said only in the evening.']);
    } else if (!same(e.text, morning.find((m) => m.id === morningId)!.text)) {
      row('evening only', null, e, [
        `The evening words of ${morningId}: needs its own recording (today it plays the morning one).`,
      ]);
    }
  }
  return rows;
}

/** CSV for Excel: UTF-8 with a BOM, every field quoted, CRLF lines. */
export function toCsv(rows: string[][]): string {
  const field = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return `﻿${rows.map((r) => r.map(field).join(',')).join('\r\n')}\r\n`;
}

// Only when run itself (not when imported, e.g. by apply-audio-sheet.ts).
if (basename(process.argv[1] ?? '') === 'audio-sheet.ts') {
  const ROOT = join(dirname(process.argv[1]!), '..', '..');
  const db = new DatabaseSync(join(ROOT, 'assets', 'db', 'content.db'), { readOnly: true });
  const rows = sheetRows(readCategory(db, MORNING), readCategory(db, EVENING));
  const out = join(ROOT, SHEET_FILE);
  // Never write over the owner's filled sheet.
  if (
    existsSync(out) &&
    /\.m4a|\.mp3/i.test(readFileSync(out, 'utf8')) &&
    !process.argv.includes('--force')
  ) {
    console.error(`${SHEET_FILE} has the owner's files in it: not written (--force to replace it)`);
    process.exit(1);
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, toCsv([HEADER, ...rows]));
  const count = (section: string) => rows.filter((r) => r[1] === section).length;
  console.log(
    `Wrote ${SHEET_FILE}: ${rows.length} recordings (` +
      ['morning + evening', 'morning', 'morning only', 'evening only']
        .map((s) => `${count(s)} ${s}`)
        .join(', ') +
      ')',
  );
}
