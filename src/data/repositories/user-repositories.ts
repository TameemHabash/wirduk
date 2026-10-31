import type { SqlDatabase } from '../db/sql';
import type { DownloadedAudio } from '../models';
import { type ReaderSession, type SavedSession, parseSession } from '../session';
import {
  type AppSettings,
  type SettingKey,
  isValidSetting,
  settingsFromStored,
} from '../settings/settings';

export type Clock = () => number;
const systemClock: Clock = () => Date.now();

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

/** Favorite categories. */
export class FavoritesRepository {
  private readonly db: SqlDatabase;
  private readonly now: Clock;

  constructor(db: SqlDatabase, now: Clock = systemClock) {
    this.db = db;
    this.now = now;
  }

  /** Favorite category ids, oldest first. */
  async list(): Promise<number[]> {
    const rows = await this.db.getAll<{ id: number }>(
      'SELECT CategoryId AS id FROM Favorites ORDER BY CreatedAt, CategoryId',
    );
    return rows.map((r) => r.id);
  }

  async add(categoryId: number): Promise<void> {
    await this.db.run('INSERT OR IGNORE INTO Favorites (CategoryId, CreatedAt) VALUES (?, ?)', [
      categoryId,
      this.now(),
    ]);
  }

  async remove(categoryId: number): Promise<void> {
    await this.db.run('DELETE FROM Favorites WHERE CategoryId = ?', [categoryId]);
  }

  /** Adds or removes. Returns the new state. */
  async toggle(categoryId: number): Promise<boolean> {
    const exists = await this.db.getFirst('SELECT 1 FROM Favorites WHERE CategoryId = ?', [
      categoryId,
    ]);
    if (exists) await this.remove(categoryId);
    else await this.add(categoryId);
    return !exists;
  }
}

/** The user's custom order of categories on the home screen. */
export class CategoryOrderRepository {
  private readonly db: SqlDatabase;

  constructor(db: SqlDatabase) {
    this.db = db;
  }

  /** Category ids in the custom order. Empty = default order. */
  async get(): Promise<number[]> {
    const rows = await this.db.getAll<{ id: number }>(
      'SELECT CategoryId AS id FROM CategoryOrder ORDER BY Position',
    );
    return rows.map((r) => r.id);
  }

  /** Saves the full order, replacing the old one in one transaction. */
  async save(orderedIds: readonly number[]): Promise<void> {
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new Error('Category order has duplicate ids');
    }
    await this.db.transaction(async (tx) => {
      await tx.run('DELETE FROM CategoryOrder');
      for (let i = 0; i < orderedIds.length; i++) {
        await tx.run('INSERT INTO CategoryOrder (CategoryId, Position) VALUES (?, ?)', [
          orderedIds[i]!,
          i + 1,
        ]);
      }
    });
  }

  /** Back to the default order ("استعادة الترتيب الافتراضي"). */
  async reset(): Promise<void> {
    await this.db.run('DELETE FROM CategoryOrder');
  }
}

/** User settings, stored as JSON per key. */
export class SettingsRepository {
  private readonly db: SqlDatabase;

  constructor(db: SqlDatabase) {
    this.db = db;
  }

  /** All settings. Missing or invalid stored values fall back to defaults. */
  async getAll(): Promise<AppSettings> {
    const rows = await this.db.getAll<{ key: string; json: string }>(
      'SELECT Key AS key, Value AS json FROM Settings',
    );
    return settingsFromStored(rows);
  }

  async set<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<void> {
    if (!isValidSetting(key, value)) {
      throw new Error(`Invalid value for setting "${key}": ${JSON.stringify(value)}`);
    }
    await this.db.run('INSERT OR REPLACE INTO Settings (Key, Value) VALUES (?, ?)', [
      key,
      JSON.stringify(value),
    ]);
  }

  async reset(key: SettingKey): Promise<void> {
    await this.db.run('DELETE FROM Settings WHERE Key = ?', [key]);
  }
}

/** Registry of audio files saved on the device. */
export class DownloadedAudioRepository {
  private readonly db: SqlDatabase;
  private readonly now: Clock;

  constructor(db: SqlDatabase, now: Clock = systemClock) {
    this.db = db;
    this.now = now;
  }

  list(lang: string): Promise<DownloadedAudio[]> {
    return this.db.getAll<DownloadedAudio>(
      `SELECT Lang AS lang, FileName AS fileName, Bytes AS bytes, DownloadedAt AS downloadedAt
         FROM DownloadedAudio WHERE Lang = ? ORDER BY FileName`,
      [lang],
    );
  }

  find(lang: string, fileName: string): Promise<DownloadedAudio | null> {
    return this.db.getFirst<DownloadedAudio>(
      `SELECT Lang AS lang, FileName AS fileName, Bytes AS bytes, DownloadedAt AS downloadedAt
         FROM DownloadedAudio WHERE Lang = ? AND FileName = ?`,
      [lang, fileName],
    );
  }

  async save(lang: string, fileName: string, bytes: number): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO DownloadedAudio (Lang, FileName, Bytes, DownloadedAt)
       VALUES (?, ?, ?, ?)`,
      [lang, fileName, bytes, this.now()],
    );
  }

  async remove(lang: string, fileName: string): Promise<void> {
    await this.db.run('DELETE FROM DownloadedAudio WHERE Lang = ? AND FileName = ?', [
      lang,
      fileName,
    ]);
  }

  /** Removes the registry of one language, or of all languages. */
  async removeAll(lang?: string): Promise<void> {
    if (lang) await this.db.run('DELETE FROM DownloadedAudio WHERE Lang = ?', [lang]);
    else await this.db.run('DELETE FROM DownloadedAudio');
  }

  async totalBytes(lang?: string): Promise<number> {
    const row = lang
      ? await this.db.getFirst<{ total: number | null }>(
          'SELECT SUM(Bytes) AS total FROM DownloadedAudio WHERE Lang = ?',
          [lang],
        )
      : await this.db.getFirst<{ total: number | null }>(
          'SELECT SUM(Bytes) AS total FROM DownloadedAudio',
        );
    return row?.total ?? 0;
  }
}
