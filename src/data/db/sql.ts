/**
 * The small database interface all repositories use.
 *
 * The app implements it with expo-sqlite (`expo-sql.ts`); tests implement it
 * with Node's built-in SQLite (`src/test-utils/node-sql.ts`). Both run the
 * same SQL, including FTS5, so repository tests exercise real queries.
 */

/** A bound value or a column value. `Uint8Array`: a BLOB (e.g. a recording in a backup file). */
export type SqlValue = string | number | null | Uint8Array;

export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SqlDatabase {
  getAll<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  getFirst<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  run(sql: string, params?: readonly SqlValue[]): Promise<RunResult>;
  /** Runs one or more statements without parameters (schema, pragmas). */
  exec(sql: string): Promise<void>;
  /**
   * Runs `task` in one exclusive transaction: all its writes apply, or none.
   * Use only the `tx` handle inside the task.
   */
  transaction<T>(task: (tx: SqlDatabase) => Promise<T>): Promise<T>;
}

export interface ClosableSqlDatabase extends SqlDatabase {
  close(): Promise<void>;
}
