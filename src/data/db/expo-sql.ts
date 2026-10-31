import type { SQLiteDatabase } from 'expo-sqlite';

import type { ClosableSqlDatabase, RunResult, SqlDatabase, SqlValue } from './sql';

type Executor = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync' | 'runAsync' | 'execAsync'>;

function wrap(db: Executor, transaction: SqlDatabase['transaction']): SqlDatabase {
  return {
    getAll: <T>(sql: string, params: readonly SqlValue[] = []) =>
      db.getAllAsync<T>(sql, params as SqlValue[]),
    getFirst: <T>(sql: string, params: readonly SqlValue[] = []) =>
      db.getFirstAsync<T>(sql, params as SqlValue[]),
    run: async (sql: string, params: readonly SqlValue[] = []): Promise<RunResult> => {
      const r = await db.runAsync(sql, params as SqlValue[]);
      return { changes: r.changes, lastInsertRowId: r.lastInsertRowId };
    },
    exec: (sql: string) => db.execAsync(sql),
    transaction,
  };
}

/** Adapts an expo-sqlite database to the app's `SqlDatabase` interface. */
export function fromExpoDatabase(db: SQLiteDatabase): ClosableSqlDatabase {
  const transaction = async <T>(task: (tx: SqlDatabase) => Promise<T>): Promise<T> => {
    let result!: T;
    // Exclusive: other queries cannot run in the middle of this transaction.
    await db.withExclusiveTransactionAsync(async (txn) => {
      const nested = () => {
        throw new Error('Nested transactions are not supported');
      };
      result = await task(wrap(txn, nested));
    });
    return result;
  };
  return { ...wrap(db, transaction), close: () => db.closeAsync() };
}
