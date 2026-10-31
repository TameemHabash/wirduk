import {
  type BackupSummary,
  type Recording,
  backupRecordings,
  openBackup,
  prepareBackup,
  restoreBackup,
} from '../backup/backup-db';
import type { SqlDatabase } from '../db/sql';

/** Settings rows of the backup (not user settings: `settingsFromStored` ignores them). */
const FILE_SAVED_AT = 'backup.fileSavedAt';
const NOTE_SHOWN_AT = 'backup.noteShownAt';

/**
 * The backup file (milestone 12): the live database's side of saving and
 * restoring, and the dates the app keeps about it.
 */
export class BackupRepository {
  private readonly db: SqlDatabase;

  constructor(db: SqlDatabase) {
    this.db = db;
  }

  /** Writes a consistent copy of the user database to `path` (must not exist). */
  async copyTo(path: string): Promise<void> {
    await this.db.run('VACUUM INTO ?', [path]);
  }

  /** File names of the user's own recordings that their adhkar use. */
  async recordingNames(): Promise<string[]> {
    const rows = await this.db.getAll<{ name: string }>(
      `SELECT DISTINCT AudioFile AS name FROM CustomAdhkar
        WHERE AudioFile IS NOT NULL AND AudioFile <> '' ORDER BY AudioFile`,
    );
    return rows.map((r) => r.name);
  }

  /** Turns a copy (see `copyTo`) into a backup file. */
  prepare(
    copy: SqlDatabase,
    info: { createdAt: number; appVersion: string },
    recordings: readonly Recording[],
  ): Promise<BackupSummary> {
    return prepareBackup(copy, info, recordings);
  }

  /** Checks a picked file and brings it up to date (throws a BackupError). */
  open(copy: SqlDatabase): Promise<BackupSummary> {
    return openBackup(copy);
  }

  /** The recordings a backup holds. */
  recordings(copy: SqlDatabase): Promise<Recording[]> {
    return backupRecordings(copy);
  }

  /** Replaces the user's data with the (opened) backup at `path`. */
  restore(path: string): Promise<void> {
    return restoreBackup(this.db, path);
  }

  private async getTime(key: string): Promise<number | null> {
    const row = await this.db.getFirst<{ value: string }>(
      'SELECT Value AS value FROM Settings WHERE Key = ?',
      [key],
    );
    const n = row ? Number(JSON.parse(row.value)) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private async setTime(key: string, at: number): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)', [
      key,
      JSON.stringify(at),
    ]);
  }

  /** When a backup file was last made and handed to the share sheet. */
  fileSavedAt(): Promise<number | null> {
    return this.getTime(FILE_SAVED_AT);
  }

  setFileSavedAt(at: number): Promise<void> {
    return this.setTime(FILE_SAVED_AT, at);
  }

  /**
   * When the data worth saving began: «أدومها» turned on, or the first own
   * category. Null when there is neither (favorites and settings alone are
   * quick to set again).
   */
  async dataSince(): Promise<number | null> {
    const row = await this.db.getFirst<{ custom: number | null; started: string | null }>(
      `SELECT (SELECT MIN(CreatedAt) FROM CustomCategories) AS custom,
              (SELECT StartedOn FROM AdwamuhaState WHERE Id = 1) AS started`,
    );
    const times: number[] = [];
    if (row?.custom != null) times.push(row.custom);
    const m = row?.started ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.started) : null;
    if (m) times.push(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime());
    return times.length > 0 ? Math.min(...times) : null;
  }

  /** When the gentle note on Home was last shown. */
  noteShownAt(): Promise<number | null> {
    return this.getTime(NOTE_SHOWN_AT);
  }

  setNoteShownAt(at: number): Promise<void> {
    return this.setTime(NOTE_SHOWN_AT, at);
  }
}
