import type { SqlDatabase } from './sql';

/**
 * Brings a database up to date with `migrations`.
 * Uses `PRAGMA user_version` to remember which ones already ran.
 *
 * Each migration runs in its own transaction with its version bump, so a crash
 * never leaves a half-applied migration.
 *
 * @returns the schema version after migrating.
 */
export async function migrate(db: SqlDatabase, migrations: readonly string[]): Promise<number> {
  const row = await db.getFirst<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current > migrations.length) {
    // The database was written by a newer app version (e.g. after a downgrade).
    throw new Error(
      `Database schema version ${current} is newer than this app supports (${migrations.length}).`,
    );
  }

  for (let version = current + 1; version <= migrations.length; version++) {
    const sql = migrations[version - 1]!;
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      // PRAGMA does not accept bound parameters; version is a trusted integer.
      await tx.exec(`PRAGMA user_version = ${Math.trunc(version)}`);
    });
  }
  return migrations.length;
}
