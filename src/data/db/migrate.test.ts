import { createNodeSqlDatabase } from '@/test-utils/node-sql';

import { migrate } from './migrate';
import { USER_MIGRATIONS, USER_SCHEMA_VERSION } from './user-schema';

const version = async (db: ReturnType<typeof createNodeSqlDatabase>) =>
  (await db.getFirst<{ user_version: number }>('PRAGMA user_version'))?.user_version;

describe('migrate', () => {
  it('creates the user schema on a new database', async () => {
    const db = createNodeSqlDatabase();
    expect(await migrate(db, USER_MIGRATIONS)).toBe(USER_SCHEMA_VERSION);
    expect(await version(db)).toBe(USER_SCHEMA_VERSION);
    const tables = await db.getAll<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    );
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'CategoryOrder',
        'CustomAdhkar',
        'DownloadedAudio',
        'Favorites',
        'Settings',
      ]),
    );
  });

  it('does nothing the second time, and keeps the data', async () => {
    const db = createNodeSqlDatabase();
    await migrate(db, USER_MIGRATIONS);
    await db.run('INSERT INTO Favorites (CategoryId, CreatedAt) VALUES (1, 1)');
    await migrate(db, USER_MIGRATIONS);
    expect(await db.getAll('SELECT * FROM Favorites')).toHaveLength(1);
  });

  it('only runs the new migrations after an app update', async () => {
    const db = createNodeSqlDatabase();
    const v1 = ['CREATE TABLE A (x INTEGER);'];
    await migrate(db, v1);
    await db.run('INSERT INTO A (x) VALUES (42)');
    await migrate(db, [...v1, 'CREATE TABLE B (y INTEGER);']);
    expect(await version(db)).toBe(2);
    expect(await db.getAll('SELECT x FROM A')).toEqual([{ x: 42 }]);
  });

  it('rolls back a failing migration completely', async () => {
    const db = createNodeSqlDatabase();
    const broken = ['CREATE TABLE A (x INTEGER); CREATE TABLE A (x INTEGER);'];
    await expect(migrate(db, broken)).rejects.toThrow();
    expect(await version(db)).toBe(0);
    expect(await db.getAll("SELECT name FROM sqlite_master WHERE name = 'A'")).toEqual([]);
  });

  it('upgrades a version-1 user database to the custom-content schema, keeping user data', async () => {
    const db = createNodeSqlDatabase();
    await migrate(db, USER_MIGRATIONS.slice(0, 1));
    await db.run('INSERT INTO Favorites (CategoryId, CreatedAt) VALUES (7, 1)');
    await migrate(db, USER_MIGRATIONS);
    expect(await version(db)).toBe(USER_SCHEMA_VERSION);
    expect(await db.getAll('SELECT CategoryId FROM Favorites')).toEqual([{ CategoryId: 7 }]);
    const cols = await db.getAll<{ name: string }>('PRAGMA table_info(CustomAdhkar)');
    expect(cols.map((c) => c.name)).toEqual(
      expect.arrayContaining(['CategoryId', 'Text', 'Count', 'Fadl', 'Source', 'AudioFile']),
    );
    expect(
      await db.getAll("SELECT name FROM sqlite_master WHERE name = 'CustomCategories'"),
    ).toHaveLength(1);
  });

  it("Adwamuha's explanation: shown on a new install, counted as seen after an update", async () => {
    const shown = async (db: ReturnType<typeof createNodeSqlDatabase>) =>
      (await db.getAll<{ key: string }>('SELECT Key AS key FROM AdwamuhaShown')).map((r) => r.key);

    const fresh = createNodeSqlDatabase();
    await migrate(fresh, USER_MIGRATIONS);
    expect(await shown(fresh)).toEqual([]);

    // An install from before Adwamuha (migrations 1–3) with the user's data.
    const updated = createNodeSqlDatabase();
    await migrate(updated, USER_MIGRATIONS.slice(0, 3));
    await updated.run("INSERT INTO Settings (Key, Value) VALUES ('theme', '\"dark\"')");
    await migrate(updated, USER_MIGRATIONS);
    expect(await shown(updated)).toEqual(['intro']);
  });

  it('refuses a database from a newer app version', async () => {
    const db = createNodeSqlDatabase();
    await db.exec('PRAGMA user_version = 99');
    await expect(migrate(db, USER_MIGRATIONS)).rejects.toThrow(/newer than this app/);
  });
});
