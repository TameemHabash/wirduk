/**
 * Prints adhkar from a content database: text, count, audio, source, fadl.
 *
 *   npm run db:peek -- 133006 1017                   (assets/db/content.db)
 *   npm run db:peek -- --db <file.db> 133006         (e.g. a copy pulled from a phone)
 *
 * Cheaper than reading content-source/*.json or docs/sources-review.md.
 */
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const args = process.argv.slice(2);
const dbFlag = args.indexOf('--db');
const dbPath =
  dbFlag >= 0
    ? args.splice(dbFlag, 2)[1]!
    : join(import.meta.dirname, '..', '..', 'assets', 'db', 'content.db');
const ids = args.map(Number).filter(Number.isInteger);
if (ids.length === 0) throw new Error('Give dhikr ids, e.g. 1017 133006');

const db = new DatabaseSync(dbPath, { readOnly: true });
const meta = db.prepare('SELECT Key, Value FROM Meta').all() as { Key: string; Value: string }[];
console.log(meta.map((m) => `${m.Key}=${m.Value}`).join('  '));

interface Row {
  id: number;
  categoryId: number;
  count: number;
  audioFile: string | null;
  repeats: number;
  text: string;
}
const dhikr = db.prepare(
  `SELECT a.Id AS id, a.CategoryId AS categoryId, a.Count AS count, a.AudioFile AS audioFile,
          COALESCE(af.Repeats, 1) AS repeats, t.Text AS text
   FROM Adhkar a JOIN DhikrTranslations t ON t.DhikrId = a.Id AND t.Lang = 'ar'
   LEFT JOIN AudioFiles af ON af.FileName = a.AudioFile AND af.Lang = 'ar'
   WHERE a.Id = ?`,
);
const source = db.prepare('SELECT * FROM DhikrSources WHERE DhikrId = ?');

for (const id of ids) {
  const d = dhikr.get(id) as Row | undefined;
  if (!d) {
    console.log(`\n${id}: not found`);
    continue;
  }
  console.log(
    `\n${id} (category ${d.categoryId}, count ${d.count}, audio ${d.audioFile ?? '-'}` +
      `${d.audioFile && d.repeats > 1 ? `, said ${d.repeats}× per recording` : ''}):\n${d.text}`,
  );
  const s = source.get(id) as Record<string, string | null> | undefined;
  if (s) {
    console.log(`  المصدر: ${s.Source}\n  الحكم: ${s.Grading ?? '-'}\n  ${s.DorarUrl}`);
    if (s.Fadl) console.log(`  الفضل: ${s.Fadl}`);
  } else {
    console.log('  (no source)');
  }
}
