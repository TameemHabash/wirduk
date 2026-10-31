import { CONTENT_META_KEYS } from './content-schema';
import type { ClosableSqlDatabase } from './sql';

/** File name of the installed content database for a version. */
export function contentFileName(version: number): string {
  return `content-v${version}.db`;
}

/** Platform operations the installer needs. Injected so it can be tested. */
export interface ContentInstallDeps {
  /** Copies the bundled database to `name`. Skips if it exists, unless `overwrite`. */
  importFromAsset(name: string, overwrite: boolean): Promise<void>;
  open(name: string): Promise<ClosableSqlDatabase>;
  exists(name: string): Promise<boolean>;
  remove(name: string): Promise<void>;
}

/** True if `db` is a healthy content database of `version`. */
async function isValid(db: ClosableSqlDatabase, version: number): Promise<boolean> {
  try {
    const check = await db.getFirst<{ quick_check: string }>('PRAGMA quick_check');
    if (check?.quick_check !== 'ok') return false;
    const row = await db.getFirst<{ Value: string }>('SELECT Value FROM Meta WHERE Key = ?', [
      CONTENT_META_KEYS.version,
    ]);
    return Number(row?.Value) === version;
  } catch {
    return false;
  }
}

/**
 * Makes sure the content database of `version` is installed and healthy,
 * opens it, and removes older versions.
 *
 * Each version lives in its own file (`content-v{N}.db`), so an app update
 * with newer content simply installs a new file. User data is in another
 * database and is never touched.
 */
export async function installContent(
  version: number,
  deps: ContentInstallDeps,
): Promise<ClosableSqlDatabase> {
  const name = contentFileName(version);

  await deps.importFromAsset(name, false);
  let db = await deps.open(name);

  if (!(await isValid(db, version))) {
    // A copy cut short (crash, full storage) or a damaged file: copy it again.
    await db.close();
    await deps.remove(name);
    await deps.importFromAsset(name, true);
    db = await deps.open(name);
    if (!(await isValid(db, version))) {
      await db.close();
      throw new Error(`Content database ${name} is damaged after a fresh copy.`);
    }
  }

  for (let old = 1; old < version; old++) {
    const oldName = contentFileName(old);
    try {
      if (await deps.exists(oldName)) await deps.remove(oldName);
    } catch {
      // Cleanup only; never block the app start.
    }
  }

  return db;
}
