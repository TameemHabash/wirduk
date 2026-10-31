import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { migrate } from '@/data/db/migrate';
import { USER_MIGRATIONS, USER_SCHEMA_VERSION } from '@/data/db/user-schema';
import { createNodeSqlDatabase } from '@/test-utils/node-sql';

import {
  BackupError,
  backupRecordings,
  openBackup,
  prepareBackup,
  restoreBackup,
} from './backup-db';

let dir: string;
let opened: { close: () => Promise<void> }[] = [];
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'wirduk-backup-'));
  opened = [];
});
afterEach(async () => {
  // Windows cannot remove a file that is still open.
  for (const db of opened) await db.close().catch(() => undefined);
  rmSync(dir, { recursive: true, force: true });
});

/** Opens a database file in the test folder (closed after the test). */
function open(path: string) {
  const db = createNodeSqlDatabase(path);
  opened.push(db);
  return db;
}

async function userDb(name: string, migrations = USER_MIGRATIONS) {
  const db = open(join(dir, name));
  await migrate(db, migrations);
  return db;
}

/** A phone's data: favorites, settings, an own category with a recorded dhikr, Adwamuha. */
async function fill(db: Awaited<ReturnType<typeof userDb>>) {
  await db.exec(`
    INSERT INTO Favorites (CategoryId, CreatedAt) VALUES (1, 10), (133, 11);
    INSERT INTO Settings (Key, Value) VALUES ('theme', '"dark"');
    INSERT INTO CustomCategories (Id, Title, SearchTitle, SortOrder, CreatedAt, UpdatedAt)
      VALUES (-1, 'mine', 'mine', 0, 1, 1);
    INSERT INTO CustomAdhkar (Id, CategoryId, Text, SearchText, Count, AudioFile, SortOrder, CreatedAt, UpdatedAt)
      VALUES (-5, -1, 'text', 'text', 3, 'a1.m4a', 0, 1, 1);
    INSERT INTO AdwamuhaState (Id, Enabled, PlanJson, StateJson, StartedOn, UpdatedAt)
      VALUES (1, 1, '{}', '{"step":4}', '2026-10-01', 1);
    INSERT INTO WardRecords (Date, Session, CompletedAt, Late, Source, Step)
      VALUES ('2026-10-01', 'morning', 1, 0, 'reader', 1), ('2026-10-01', 'evening', 2, 0, 'reader', 1),
             ('2026-10-02', 'morning', 3, 0, 'manual', 1);
    INSERT INTO DownloadedAudio (Lang, FileName, Bytes, DownloadedAt) VALUES ('ar', 'x', 9, 1);
    INSERT INTO SavedSession (Id, Json, SavedAt) VALUES (1, '{}', 1);
  `);
}

const recording = { name: 'a1.m4a', bytes: new Uint8Array([1, 2, 3, 250]) };

/** Makes a backup file of `db` the way the app does (VACUUM INTO, then prepareBackup). */
async function backupOf(db: Awaited<ReturnType<typeof userDb>>, file = 'backup.wirduk') {
  const path = join(dir, file);
  await db.run('VACUUM INTO ?', [path]);
  const copy = createNodeSqlDatabase(path);
  const summary = await prepareBackup(copy, { createdAt: 1234, appVersion: '1.0.0' }, [recording]);
  await copy.close();
  return { path, summary };
}

describe('the backup file', () => {
  it("holds the user's data and recordings, not this phone's downloads or session", async () => {
    const phone = await userDb('user.db');
    await fill(phone);
    const { path, summary } = await backupOf(phone);
    expect(summary).toEqual({
      format: 1,
      createdAt: 1234,
      appVersion: '1.0.0',
      favorites: 2,
      customCategories: 1,
      customAdhkar: 1,
      recordings: 1,
      recordingBytes: 4,
      wardDays: 2,
      adwamuhaStep: 4,
    });
    const copy = open(path);
    expect(await copy.getAll('SELECT * FROM DownloadedAudio')).toEqual([]);
    expect(await copy.getAll('SELECT * FROM SavedSession')).toEqual([]);
    expect(await backupRecordings(copy)).toEqual([recording]);
    // The live database is untouched.
    expect(await phone.getAll('SELECT FileName FROM DownloadedAudio')).toEqual([{ FileName: 'x' }]);
  });

  it("restore replaces the user's data and keeps this phone's own tables", async () => {
    const old = await userDb('old.db');
    await fill(old);
    const { path } = await backupOf(old);

    const phone = await userDb('user.db');
    await phone.exec(`
      INSERT INTO Favorites (CategoryId, CreatedAt) VALUES (7, 1);
      INSERT INTO DownloadedAudio (Lang, FileName, Bytes, DownloadedAt) VALUES ('ar', 'here', 5, 1);
    `);
    const copy = open(path);
    expect((await openBackup(copy)).customAdhkar).toBe(1);
    await copy.close();
    await restoreBackup(phone, path);

    expect(await phone.getAll('SELECT CategoryId FROM Favorites ORDER BY CategoryId')).toEqual([
      { CategoryId: 1 },
      { CategoryId: 133 },
    ]);
    expect(await phone.getFirst('SELECT Id, CategoryId, AudioFile FROM CustomAdhkar')).toEqual({
      Id: -5,
      CategoryId: -1,
      AudioFile: 'a1.m4a',
    });
    expect(await phone.getFirst('SELECT StateJson FROM AdwamuhaState')).toEqual({
      StateJson: '{"step":4}',
    });
    expect(await phone.getAll('SELECT FileName FROM DownloadedAudio')).toEqual([
      { FileName: 'here' },
    ]);
    // The backup's own tables do not come in.
    expect(await phone.getAll("SELECT name FROM sqlite_master WHERE name LIKE 'Backup%'")).toEqual(
      [],
    );
  });

  it('a restore that fails half-way changes nothing', async () => {
    const old = await userDb('old.db');
    await fill(old);
    const { path } = await backupOf(old);
    // A row the live database refuses (count 0), after the favorites were already copied.
    const copy = open(path);
    await copy.exec('PRAGMA ignore_check_constraints = ON; UPDATE CustomAdhkar SET Count = 0;');
    await copy.close();

    const phone = await userDb('user.db');
    await phone.exec('INSERT INTO Favorites (CategoryId, CreatedAt) VALUES (7, 1)');
    await expect(restoreBackup(phone, path)).rejects.toThrow();
    expect(await phone.getAll('SELECT CategoryId FROM Favorites')).toEqual([{ CategoryId: 7 }]);
    expect(await phone.getAll('SELECT * FROM CustomAdhkar')).toEqual([]);
    // And the backup was detached.
    expect(
      (await phone.getAll<{ name: string }>('PRAGMA database_list')).map((d) => d.name),
    ).toEqual(['main']);
  });

  it('an older backup is brought up to date first', async () => {
    const old = await userDb('old.db', USER_MIGRATIONS.slice(0, 4));
    await fill(old);
    const { path } = await backupOf(old);
    const copy = open(path);
    await openBackup(copy);
    expect(await copy.getFirst('PRAGMA user_version')).toEqual({
      user_version: USER_SCHEMA_VERSION,
    });
    // Migration 5: an install with data has seen the explanation.
    expect(await copy.getFirst("SELECT Key FROM AdwamuhaShown WHERE Key = 'intro'")).toEqual({
      Key: 'intro',
    });
  });

  it('says plainly what is wrong with a file that cannot be restored', async () => {
    const problem = async (db: ReturnType<typeof createNodeSqlDatabase>) =>
      openBackup(db).then(
        () => 'ok',
        (e: unknown) => (e instanceof BackupError ? e.problem : `other: ${String(e)}`),
      );

    // A user database that is not a backup.
    expect(await problem(await userDb('plain.db'))).toBe('not-backup');

    // A backup from a newer app (newer file format, or newer data).
    const phone = await userDb('user.db');
    const newerFormat = open((await backupOf(phone, 'f.wirduk')).path);
    await newerFormat.exec("UPDATE BackupMeta SET Value = '99' WHERE Key = 'format'");
    expect(await problem(newerFormat)).toBe('newer');
    const newerSchema = open((await backupOf(phone, 's.wirduk')).path);
    await newerSchema.exec(`PRAGMA user_version = ${USER_SCHEMA_VERSION + 1}`);
    expect(await problem(newerSchema)).toBe('newer');
  });
});
