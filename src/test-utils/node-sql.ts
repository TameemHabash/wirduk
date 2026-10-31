/**
 * Test-only `SqlDatabase` backed by Node's built-in SQLite (has FTS5).
 * Never import this from app code.
 */
import { DatabaseSync } from 'node:sqlite';

import type { ClosableSqlDatabase, SqlDatabase, SqlValue } from '@/data/db/sql';

export function createNodeSqlDatabase(
  path = ':memory:',
  options: { readOnly?: boolean } = {},
): ClosableSqlDatabase & {
  raw: DatabaseSync;
} {
  const raw = new DatabaseSync(path, { readOnly: options.readOnly ?? false });
  let inTransaction = false;

  const db: SqlDatabase = {
    getAll: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      raw.prepare(sql).all(...params) as T[],
    getFirst: async <T>(sql: string, params: readonly SqlValue[] = []) =>
      (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    run: async (sql: string, params: readonly SqlValue[] = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) };
    },
    exec: async (sql: string) => {
      raw.exec(sql);
    },
    transaction: async <T>(task: (tx: SqlDatabase) => Promise<T>) => {
      if (inTransaction) throw new Error('Nested transactions are not supported');
      inTransaction = true;
      raw.exec('BEGIN IMMEDIATE');
      try {
        const result = await task(db);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        inTransaction = false;
      }
    },
  };

  return {
    ...db,
    raw,
    close: async () => raw.close(),
  };
}
