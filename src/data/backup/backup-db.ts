/**
 * The backup file (milestone 12, owner 2026-10-25) is itself a SQLite database:
 * a consistent copy of user.db (`VACUUM INTO`) plus two tables of its own,
 * `BackupMeta` (what it is, when it was made) and `BackupRecordings` (the
 * user's own recordings, as BLOBs). Restoring brings the copy up to date with
 * the usual migrations, then copies its tables into the live database in one
 * transaction: all of it, or nothing.
 *
 * Only SQL here (tested with Node's SQLite); files and sharing live in
 * `backup-files.ts`.
 */
import { migrate } from '@/data/db/migrate';
import type { SqlDatabase } from '@/data/db/sql';
import { USER_MIGRATIONS, USER_SCHEMA_VERSION } from '@/data/db/user-schema';

/** Bump when the file's own layout (BackupMeta / BackupRecordings) changes. */
export const BACKUP_FORMAT = 1;
const BACKUP_APP = 'wirduk';

/**
 * Tables that belong to this phone, not to the user's data: downloaded audio
 * (the files are not in the backup) and the reader's last session. They are
 * left empty in a backup and kept as they are on restore.
 */
export const DEVICE_TABLES: readonly string[] = ['DownloadedAudio', 'SavedSession'];

const OWN_TABLES = ['BackupMeta', 'BackupRecordings'];

export interface Recording {
  name: string;
  bytes: Uint8Array;
}

/** What a backup holds, shown before restoring. */
export interface BackupSummary {
  format: number;
  /** When it was made (ms since 1970). */
  createdAt: number;
  appVersion: string;
  favorites: number;
  customCategories: number;
  customAdhkar: number;
  recordings: number;
  recordingBytes: number;
  /** Days with a ward done (morning or evening). */
  wardDays: number;
  /** Adwamuha's step, when it was ever turned on. */
  adwamuhaStep: number | null;
}

export type BackupProblem =
  /** Not a backup of this app (or not a database at all). */
  | 'not-backup'
  /** Made by a newer version of the app: update the app first. */
  | 'newer'
  /** A backup, but damaged. */
  | 'damaged';

export class BackupError extends Error {
  constructor(
    readonly problem: BackupProblem,
    message: string,
  ) {
    super(message);
    this.name = 'BackupError';
  }
}

const count = async (db: SqlDatabase, sql: string) =>
  (await db.getFirst<{ n: number }>(sql))?.n ?? 0;

async function tableNames(db: SqlDatabase, schema = 'main'): Promise<string[]> {
  const rows = await db.getAll<{ name: string }>(
    `SELECT name FROM ${schema}.sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  );
  return rows.map((r) => r.name);
}

async function summarize(db: SqlDatabase, meta: Record<string, string>): Promise<BackupSummary> {
  const step = await db.getFirst<{ json: string }>(
    'SELECT StateJson AS json FROM AdwamuhaState WHERE Id = 1',
  );
  let adwamuhaStep: number | null = null;
  try {
    const s = step ? (JSON.parse(step.json) as { step?: unknown }) : null;
    if (s && typeof s.step === 'number') adwamuhaStep = s.step;
  } catch {
    adwamuhaStep = null;
  }
  return {
    format: Number(meta.format),
    createdAt: Number(meta.createdAt),
    appVersion: meta.appVersion ?? '',
    favorites: await count(db, 'SELECT COUNT(*) AS n FROM Favorites'),
    customCategories: await count(db, 'SELECT COUNT(*) AS n FROM CustomCategories'),
    customAdhkar: await count(db, 'SELECT COUNT(*) AS n FROM CustomAdhkar'),
    recordings: await count(db, 'SELECT COUNT(*) AS n FROM BackupRecordings'),
    recordingBytes: await count(
      db,
      'SELECT COALESCE(SUM(LENGTH(Data)), 0) AS n FROM BackupRecordings',
    ),
    wardDays: await count(db, 'SELECT COUNT(DISTINCT Date) AS n FROM WardRecords'),
    adwamuhaStep,
  };
}

/**
 * Turns a fresh `VACUUM INTO` copy of user.db into a backup: empties this
 * phone's own tables, adds the recordings and what the file is.
 */
export async function prepareBackup(
  copy: SqlDatabase,
  info: { createdAt: number; appVersion: string },
  recordings: readonly Recording[],
): Promise<BackupSummary> {
  const meta: Record<string, string> = {
    app: BACKUP_APP,
    format: String(BACKUP_FORMAT),
    createdAt: String(info.createdAt),
    appVersion: info.appVersion,
  };
  await copy.transaction(async (tx) => {
    for (const table of DEVICE_TABLES) await tx.exec(`DELETE FROM ${table}`);
    await tx.exec(`
      CREATE TABLE BackupMeta (Key TEXT PRIMARY KEY, Value TEXT NOT NULL);
      CREATE TABLE BackupRecordings (Name TEXT PRIMARY KEY, Data BLOB NOT NULL);
    `);
    for (const [key, value] of Object.entries(meta)) {
      await tx.run('INSERT INTO BackupMeta (Key, Value) VALUES (?, ?)', [key, value]);
    }
    for (const r of recordings) {
      await tx.run('INSERT OR REPLACE INTO BackupRecordings (Name, Data) VALUES (?, ?)', [
        r.name,
        r.bytes,
      ]);
    }
  });
  return summarize(copy, meta);
}

/**
 * Checks a file that should be a backup, and brings its data up to the
 * current schema (an older backup goes through the usual migrations).
 * Throws a `BackupError` that says what is wrong.
 */
export async function openBackup(copy: SqlDatabase): Promise<BackupSummary> {
  let meta: Record<string, string>;
  try {
    const rows = await copy.getAll<{ Key: string; Value: string }>(
      'SELECT Key, Value FROM BackupMeta',
    );
    meta = Object.fromEntries(rows.map((r) => [r.Key, r.Value]));
  } catch {
    throw new BackupError('not-backup', 'No BackupMeta table');
  }
  if (meta.app !== BACKUP_APP || !Number.isInteger(Number(meta.format))) {
    throw new BackupError('not-backup', `Not a ${BACKUP_APP} backup`);
  }
  if (Number(meta.format) > BACKUP_FORMAT) {
    throw new BackupError('newer', `Backup format ${meta.format} is newer than ${BACKUP_FORMAT}`);
  }
  const version = (await copy.getFirst<{ user_version: number }>('PRAGMA user_version'))
    ?.user_version;
  if (version !== undefined && version > USER_SCHEMA_VERSION) {
    throw new BackupError('newer', `Backup schema ${version} is newer than ${USER_SCHEMA_VERSION}`);
  }
  const check = await copy.getFirst<{ quick_check: string }>('PRAGMA quick_check');
  if (check?.quick_check !== 'ok') {
    throw new BackupError('damaged', `quick_check: ${check?.quick_check ?? 'no answer'}`);
  }
  try {
    await migrate(copy, USER_MIGRATIONS);
    return await summarize(copy, meta);
  } catch (e) {
    throw new BackupError('damaged', e instanceof Error ? e.message : String(e));
  }
}

/** The recordings a backup holds. */
export function backupRecordings(copy: SqlDatabase): Promise<Recording[]> {
  return copy.getAll<Recording>('SELECT Name AS name, Data AS bytes FROM BackupRecordings');
}

/**
 * Replaces the user's data in `live` with the backup at `backupPath` (already
 * checked and migrated by `openBackup`): every table except this phone's own
 * ones, in one transaction. Foreign keys are checked at the end.
 *
 * The transaction runs on `live`'s own connection with BEGIN / COMMIT, not
 * `live.transaction()`: expo-sqlite runs that on a new connection, which
 * would not see the attached backup.
 */
export async function restoreBackup(live: SqlDatabase, backupPath: string): Promise<void> {
  await live.run('ATTACH DATABASE ? AS backup', [backupPath]);
  try {
    const liveTables = await tableNames(live);
    const backupTables = new Set(await tableNames(live, 'backup'));
    const tables = liveTables.filter((t) => !DEVICE_TABLES.includes(t) && !OWN_TABLES.includes(t));
    const missing = tables.filter((t) => !backupTables.has(t));
    if (missing.length > 0) {
      throw new BackupError('damaged', `Tables missing in the backup: ${missing.join(', ')}`);
    }
    const columns = new Map<string, string>();
    for (const table of tables) {
      const info = await live.getAll<{ name: string }>(`PRAGMA main.table_info("${table}")`);
      columns.set(table, info.map((c) => `"${c.name}"`).join(', '));
    }

    await live.exec('BEGIN IMMEDIATE');
    try {
      await live.exec('PRAGMA defer_foreign_keys = ON');
      for (const table of tables) {
        const cols = columns.get(table)!;
        await live.exec(`DELETE FROM main."${table}"`);
        await live.exec(
          `INSERT INTO main."${table}" (${cols}) SELECT ${cols} FROM backup."${table}"`,
        );
      }
      await live.exec('COMMIT');
    } catch (e) {
      await live.exec('ROLLBACK');
      throw e;
    }
  } finally {
    await live.exec('DETACH DATABASE backup');
  }
}
