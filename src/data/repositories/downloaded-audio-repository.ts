import type { DownloadedAudio } from '@/data/models';

import type { SqlDatabase } from '../db/sql';

import { type Clock, systemClock } from './clock';

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
