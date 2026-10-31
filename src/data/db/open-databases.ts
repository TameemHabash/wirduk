import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { APP_CONFIG } from '@/config/app-config';

import { installContent } from './content-install';
import { fromExpoDatabase } from './expo-sql';
import { migrate } from './migrate';
import type { ClosableSqlDatabase } from './sql';
import { USER_MIGRATIONS } from './user-schema';

const CONTENT_ASSET = require('../../../assets/db/content.db') as number;

export const USER_DB_NAME = 'user.db';

export interface AppDatabases {
  content: ClosableSqlDatabase;
  user: ClosableSqlDatabase;
}

/** expo-sqlite gives a plain path on Android; expo-file-system wants a URI. */
function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function sqliteDir(): Directory {
  return new Directory(toFileUri(String(SQLite.defaultDatabaseDirectory)));
}

/** A file in the folder where expo-sqlite keeps its databases (open it by its name). */
export function sqliteFile(name: string): File {
  return new File(sqliteDir(), name);
}

/** The plain path of such a file, for SQL that names a file (VACUUM INTO, ATTACH). */
export function sqlitePath(name: string): string {
  return decodeURIComponent(sqliteFile(name).uri.replace(/^file:\/\//, ''));
}

async function importContentAsset(name: string, overwrite: boolean): Promise<void> {
  const target = sqliteFile(name);
  if (target.exists && !overwrite) return;

  const asset = await Asset.fromModule(CONTENT_ASSET).downloadAsync();
  if (!asset.localUri) throw new Error('The content database asset has no local file');

  const dir = sqliteDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });

  // Copy under a temporary name, then rename: a copy cut short by a crash or
  // full storage never looks like a complete database.
  const tmp = sqliteFile(`${name}.tmp`);
  if (tmp.exists) tmp.delete();
  await new File(asset.localUri).copy(tmp);
  if (target.exists) target.delete();
  tmp.rename(name);
}

/** Deletes a database and its side files (journal, WAL, a half-copied .tmp). */
export async function removeDatabaseFiles(name: string): Promise<void> {
  for (const suffix of ['', '-wal', '-shm', '-journal', '.tmp']) {
    const f = sqliteFile(`${name}${suffix}`);
    if (f.exists) f.delete();
  }
}

let opening: Promise<AppDatabases> | null = null;

/**
 * Opens both databases at app start:
 *  - content: installs/updates the shipped copy for the current content version;
 *  - user: creates it on first start and runs pending migrations.
 *
 * Calls share one run, so two overlapping starts never install the same
 * file at once. After a failure the next call (retry) starts again.
 */
export function openAppDatabases(): Promise<AppDatabases> {
  opening ??= openBoth().catch((e: unknown) => {
    opening = null;
    throw e;
  });
  return opening;
}

/**
 * The content database has an FTS5 table. `PRAGMA quick_check` makes FTS5
 * prepare its own internal statements. By default expo-sqlite finalizes every
 * statement before closing, and then SQLite's close finalizes FTS5's again:
 * a double free that crashed the app when an invalid copy was closed to be
 * copied again. Our queries always finalize their own statements, so the
 * close does not need to.
 */
const CONTENT_OPEN_OPTIONS: SQLite.SQLiteOpenOptions = {
  finalizeUnusedStatementsBeforeClosing: false,
};

/**
 * expo-asset leaves its own copy of the bundled content database in the cache
 * (`ExponentAsset-<hash>.db`, ≈4.6 MB, one more per content version). Once the
 * content is installed and checked, none of them is needed (milestone 13).
 * Not before: a damaged install copies the asset again from that file.
 */
function removeCachedContentCopies(): void {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && /^ExponentAsset-.+\.db$/.test(entry.name)) entry.delete();
    }
  } catch {
    // Cleanup only; never block the app start.
  }
}

async function openBoth(): Promise<AppDatabases> {
  const content = await installContent(APP_CONFIG.content.version, {
    importFromAsset: importContentAsset,
    open: async (name) =>
      fromExpoDatabase(await SQLite.openDatabaseAsync(name, CONTENT_OPEN_OPTIONS)),
    exists: async (name) => sqliteFile(name).exists,
    remove: removeDatabaseFiles,
  });
  removeCachedContentCopies();

  const userDb = await SQLite.openDatabaseAsync(USER_DB_NAME);
  await userDb.execAsync('PRAGMA journal_mode = WAL;');
  const user = fromExpoDatabase(userDb);
  await migrate(user, USER_MIGRATIONS);

  return { content, user };
}
