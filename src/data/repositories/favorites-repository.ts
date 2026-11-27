import type { SqlDatabase } from '../db/sql';

import { type Clock, systemClock } from './clock';

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
