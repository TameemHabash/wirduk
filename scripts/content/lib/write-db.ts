import { createHash } from 'node:crypto';

import { CONTENT_META_KEYS, CONTENT_SCHEMA_SQL } from '../../../src/data/db/content-schema.ts';
import { toSearchText } from '../../../src/text/normalize.ts';

import type { ContentModel } from './types.ts';

/** The subset of node:sqlite's DatabaseSync this module uses. */
export interface SyncDb {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: (string | number | null)[]): unknown;
    all(...params: (string | number | null)[]): unknown[];
  };
}

export interface ContentMeta {
  version: number;
  sourceCommit: string;
}

/** Writes the content model into an empty database. */
export function writeContentDb(db: SyncDb, model: ContentModel, meta: ContentMeta): void {
  db.exec(CONTENT_SCHEMA_SQL);
  db.exec('BEGIN');
  try {
    const insMeta = db.prepare('INSERT INTO Meta (Key, Value) VALUES (?, ?)');
    insMeta.run(CONTENT_META_KEYS.version, String(meta.version));
    insMeta.run(CONTENT_META_KEYS.sourceCommit, meta.sourceCommit);

    const insCat = db.prepare('INSERT INTO Categories (Id, SortOrder, AudioFile) VALUES (?, ?, ?)');
    const insCatTr = db.prepare(
      'INSERT INTO CategoryTranslations (CategoryId, Lang, Title, SearchTitle) VALUES (?, ?, ?, ?)',
    );
    for (const c of model.categories) {
      insCat.run(c.id, c.sortOrder, c.audioFile);
      for (const [lang, title] of Object.entries(c.titles)) {
        insCatTr.run(c.id, lang, title, toSearchText(title));
      }
    }

    const insDhikr = db.prepare(
      'INSERT INTO Adhkar (Id, CategoryId, SortOrder, Count, AudioFile) VALUES (?, ?, ?, ?, ?)',
    );
    const insDhikrTr = db.prepare(
      'INSERT INTO DhikrTranslations (DhikrId, Lang, Text, SearchText) VALUES (?, ?, ?, ?)',
    );
    const insSearch = db.prepare(
      'INSERT INTO DhikrSearch (rowid, SearchText, DhikrId, Lang) VALUES (?, ?, ?, ?)',
    );
    let searchRow = 0;
    for (const d of model.adhkar) {
      insDhikr.run(d.id, d.categoryId, d.sortOrder, d.count, d.audioFile);
      for (const [lang, text] of Object.entries(d.texts)) {
        const searchText = toSearchText(text);
        insDhikrTr.run(d.id, lang, text, searchText);
        insSearch.run(++searchRow, searchText, d.id, lang);
      }
    }

    const insAudio = db.prepare(
      'INSERT INTO AudioFiles (Lang, FileName, Bytes, Repeats) VALUES (?, ?, ?, ?)',
    );
    for (const f of model.audioFiles) insAudio.run(f.lang, f.fileName, f.bytes, f.repeats);

    const insSource = db.prepare(
      'INSERT INTO DhikrSources (DhikrId, Lang, Fadl, Source, Grading, DorarUrl) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const s of model.sources) {
      insSource.run(s.dhikrId, s.lang, s.fadl, s.source, s.grading, s.dorarUrl);
    }

    if (model.plan) {
      const insStage = db.prepare('INSERT INTO PlanStages (Stage, Weeks) VALUES (?, ?)');
      const insStageTr = db.prepare(
        'INSERT INTO PlanStageTranslations (Stage, Lang, Title) VALUES (?, ?, ?)',
      );
      for (const s of model.plan.stages) {
        insStage.run(s.stage, s.weeks);
        for (const [lang, title] of Object.entries(s.titles)) insStageTr.run(s.stage, lang, title);
      }
      const insStep = db.prepare(
        'INSERT INTO PlanSteps (Step, Stage, MorningDhikrId, EveningDhikrId) VALUES (?, ?, ?, ?)',
      );
      for (const s of model.plan.steps) {
        insStep.run(s.step, s.stage, s.morningDhikrId, s.eveningDhikrId);
      }
    }

    const insMessage = db.prepare(
      `INSERT INTO AdwamuhaMessages (Lang, Id, Kind, Moments, Text, Sura, SuraName, FromAya, ToAya,
         Rawi, Muhaddith, Book, Number, Grading, DorarUrl)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const m of model.messages ?? []) {
      const v = m.verse;
      const h = m.hadith;
      insMessage.run(
        m.lang,
        m.id,
        m.kind,
        m.moments.join(' '),
        m.text,
        v?.sura ?? null,
        v?.suraName ?? null,
        v?.from ?? null,
        v?.to ?? null,
        h?.rawi ?? null,
        h?.muhaddith ?? null,
        h?.book ?? null,
        h?.number ?? null,
        h?.grading ?? null,
        h?.dorarUrl ?? null,
      );
    }

    const insText = db.prepare(
      'INSERT INTO AdwamuhaTexts (Lang, Id, Moment, State, Text, Author) VALUES (?, ?, ?, ?, ?, ?)',
    );
    for (const t of model.texts ?? [])
      insText.run(t.lang, t.id, t.moment, t.state, t.text, t.author);

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  db.exec("INSERT INTO DhikrSearch (DhikrSearch) VALUES ('optimize')");
}

/** Tables and the ORDER BY that makes their dump stable. */
const DUMP_QUERIES: Record<string, string> = {
  Meta: 'SELECT Key, Value FROM Meta WHERE Key <> ? ORDER BY Key',
  Categories: 'SELECT * FROM Categories ORDER BY Id',
  CategoryTranslations: 'SELECT * FROM CategoryTranslations ORDER BY CategoryId, Lang',
  Adhkar: 'SELECT * FROM Adhkar ORDER BY Id',
  DhikrTranslations: 'SELECT * FROM DhikrTranslations ORDER BY DhikrId, Lang',
  DhikrSources: 'SELECT * FROM DhikrSources ORDER BY DhikrId, Lang',
  AudioFiles: 'SELECT * FROM AudioFiles ORDER BY Lang, FileName',
  PlanStages: 'SELECT * FROM PlanStages ORDER BY Stage',
  PlanStageTranslations: 'SELECT * FROM PlanStageTranslations ORDER BY Stage, Lang',
  PlanSteps: 'SELECT * FROM PlanSteps ORDER BY Step',
  AdwamuhaMessages: 'SELECT * FROM AdwamuhaMessages ORDER BY Lang, Id',
  AdwamuhaTexts: 'SELECT * FROM AdwamuhaTexts ORDER BY Lang, Id',
  DhikrSearch: 'SELECT rowid, SearchText, DhikrId, Lang FROM DhikrSearch ORDER BY rowid',
};

/**
 * Fingerprint of the database CONTENT (not its bytes, which can change with
 * the SQLite version). The version row is left out, so the fingerprint says
 * whether the content changed, independent of the version number.
 */
export function contentFingerprint(db: SyncDb): string {
  const hash = createHash('sha256');
  for (const [table, sql] of Object.entries(DUMP_QUERIES)) {
    const rows =
      table === 'Meta' ? db.prepare(sql).all(CONTENT_META_KEYS.version) : db.prepare(sql).all();
    hash.update(table);
    hash.update(JSON.stringify(rows.map((r) => Object.values(r as object))));
  }
  return hash.digest('hex');
}

/** Reads the content version stored in a database. */
export function readContentVersion(db: SyncDb): number {
  const rows = db
    .prepare('SELECT Value FROM Meta WHERE Key = ?')
    .all(CONTENT_META_KEYS.version) as {
    Value: string;
  }[];
  const value = rows[0]?.Value;
  if (value == null) throw new Error('No content version in database');
  return Number(value);
}
