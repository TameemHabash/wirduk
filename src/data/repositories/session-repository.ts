import type { SqlDatabase } from '../db/sql';
import { type ReaderSession, type SavedSession, parseSession } from '../session';

import { type Clock, systemClock } from './clock';

/** The reader's saved place and counts ("continue where I stopped"). One row at most. */
export class SessionRepository {
  private readonly db: SqlDatabase;
  private readonly now: Clock;

  constructor(db: SqlDatabase, now: Clock = systemClock) {
    this.db = db;
    this.now = now;
  }

  async save(session: ReaderSession): Promise<void> {
    await this.db.run('INSERT OR REPLACE INTO SavedSession (Id, Json, SavedAt) VALUES (1, ?, ?)', [
      JSON.stringify(session),
      this.now(),
    ]);
  }

  /** The saved state, or null (none, or damaged). */
  async load(): Promise<SavedSession | null> {
    const row = await this.db.getFirst<{ json: string; savedAt: number }>(
      'SELECT Json AS json, SavedAt AS savedAt FROM SavedSession WHERE Id = 1',
    );
    return row ? parseSession(row.json, row.savedAt) : null;
  }

  async clear(): Promise<void> {
    await this.db.run('DELETE FROM SavedSession');
  }
}
