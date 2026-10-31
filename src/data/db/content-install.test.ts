import { createNodeSqlDatabase } from '@/test-utils/node-sql';

import { contentFileName, installContent, type ContentInstallDeps } from './content-install';
import { CONTENT_META_KEYS } from './content-schema';

/**
 * A fake file system of content databases. Each "file" is a version number,
 * or 'damaged'. Opening builds an in-memory database that matches it.
 */
function fakeDeps(bundledVersion: number, initial: Record<string, number | 'damaged'> = {}) {
  const files = new Map<string, number | 'damaged'>(Object.entries(initial));
  const log: string[] = [];

  const deps: ContentInstallDeps = {
    importFromAsset: async (name, overwrite) => {
      log.push(`import ${name}${overwrite ? ' (overwrite)' : ''}`);
      if (overwrite || !files.has(name)) files.set(name, bundledVersion);
    },
    open: async (name) => {
      const db = createNodeSqlDatabase();
      const v = files.get(name);
      if (v !== 'damaged' && v !== undefined) {
        db.raw.exec('CREATE TABLE Meta (Key TEXT PRIMARY KEY, Value TEXT NOT NULL)');
        db.raw.prepare('INSERT INTO Meta VALUES (?, ?)').run(CONTENT_META_KEYS.version, String(v));
      }
      return db;
    },
    exists: async (name) => files.has(name),
    remove: async (name) => {
      log.push(`remove ${name}`);
      files.delete(name);
    },
  };
  return { deps, files, log };
}

describe('installContent', () => {
  it('names files by version', () => {
    expect(contentFileName(3)).toBe('content-v3.db');
  });

  it('installs the bundled database on first start', async () => {
    const { deps, files } = fakeDeps(1);
    const db = await installContent(1, deps);
    expect(files.get('content-v1.db')).toBe(1);
    await db.close();
  });

  it('reuses the installed copy when it is healthy', async () => {
    const { deps, log } = fakeDeps(2, { 'content-v2.db': 2 });
    await (await installContent(2, deps)).close();
    expect(log).toEqual(['import content-v2.db']); // import skipped the copy, no remove
  });

  it('installs the new version after an app update and removes old ones', async () => {
    const { deps, files } = fakeDeps(3, { 'content-v1.db': 1, 'content-v2.db': 2 });
    await (await installContent(3, deps)).close();
    expect([...files.keys()]).toEqual(['content-v3.db']);
  });

  it('copies again when the installed file is damaged (e.g. a cut-short copy)', async () => {
    const { deps, files, log } = fakeDeps(2, { 'content-v2.db': 'damaged' });
    await (await installContent(2, deps)).close();
    expect(files.get('content-v2.db')).toBe(2);
    expect(log).toContain('import content-v2.db (overwrite)');
  });

  it('fails clearly when even a fresh copy is wrong', async () => {
    // The bundle claims version 1 but the app expects 2.
    const { deps } = fakeDeps(1);
    await expect(installContent(2, deps)).rejects.toThrow(/damaged after a fresh copy/);
  });

  it('never fails because cleanup of an old file failed', async () => {
    const { deps } = fakeDeps(2, { 'content-v1.db': 1 });
    deps.remove = async () => {
      throw new Error('file is locked');
    };
    await expect(installContent(2, deps)).resolves.toBeDefined();
  });
});
