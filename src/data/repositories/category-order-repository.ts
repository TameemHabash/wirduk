import type { SqlDatabase } from '../db/sql';

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
