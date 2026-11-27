/**
 * The app start: both databases opened side by side (RF5). The phone's files and SQLite are
 * stand-ins (an in-memory folder; a database "file" holds a short text saying what it is);
 * the real content installer runs on them. Migrations have their own tests (migrate.test.ts).
 */
import type { AppDatabases } from './open-databases';

// --- the phone's files, in memory: uri → content ------------------------------------------
const mockFiles = new Map<string, string>();
const mockDirs = new Set<string>();
const mockLog: string[] = [];

jest.mock('expo-file-system', () => {
  const join = (dir: string, name: string) => `${dir.replace(/\/$/, '')}/${name}`;
  class File {
    uri: string;
    constructor(dirOrUri: { uri: string } | string, name?: string) {
      const base = typeof dirOrUri === 'string' ? dirOrUri : dirOrUri.uri;
      this.uri = name ? join(base, name) : base;
    }
    get name() {
      return this.uri.split('/').pop()!;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    delete() {
      mockLog.push(`delete ${this.name}`);
      mockFiles.delete(this.uri);
    }
    async copy(target: File) {
      mockLog.push(`copy ${this.name} → ${target.name}`);
      mockFiles.set(target.uri, mockFiles.get(this.uri)!);
    }
    rename(name: string) {
      mockLog.push(`rename ${this.name} → ${name}`);
      const content = mockFiles.get(this.uri)!;
      mockFiles.delete(this.uri);
      this.uri = join(this.uri.slice(0, this.uri.lastIndexOf('/')), name);
      mockFiles.set(this.uri, content);
    }
  }
  class Directory {
    uri: string;
    constructor(dirUri: string) {
      this.uri = dirUri;
    }
    get exists() {
      return mockDirs.has(this.uri);
    }
    create() {
      mockDirs.add(this.uri);
    }
    list() {
      return [...mockFiles.keys()]
        .filter((u) => u.startsWith(`${this.uri}/`) && !u.slice(this.uri.length + 1).includes('/'))
        .map((u) => new File(u));
    }
  }
  return { File, Directory, Paths: { cache: 'file:///cache' } };
});

// --- the bundled content database and expo-asset's cached copy of it ----------------------
const ASSET_COPY = 'file:///cache/ExponentAsset-abc.db';
const mockAsset = { downloads: 0 };
jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: () => ({
      downloadAsync: async () => {
        mockAsset.downloads++;
        return { localUri: 'file:///cache/ExponentAsset-abc.db' };
      },
    }),
  },
}));
jest.mock('../../../assets/db/content.db', () => 1);

// --- SQLite: a database answers from what its file says -----------------------------------
const SQLITE = 'file:///data/SQLite';
const mockOpened: { name: string; closed: boolean; exec: string[] }[] = [];
jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '/data/SQLite', // a plain path on Android
  openDatabaseAsync: async (name: string) => {
    const handle = { name, closed: false, exec: [] as string[] };
    mockOpened.push(handle);
    const file = () => mockFiles.get(`file:///data/SQLite/${name}`) ?? '';
    return {
      getFirstAsync: async (sql: string) => {
        if (sql.startsWith('PRAGMA quick_check')) {
          return { quick_check: file().startsWith('content') ? 'ok' : 'damaged' };
        }
        if (sql.includes('FROM Meta')) return { Value: file().split(':v')[1] ?? null };
        return null;
      },
      getAllAsync: async () => [],
      runAsync: async () => ({ changes: 0, lastInsertRowId: 0 }),
      execAsync: async (sql: string) => {
        handle.exec.push(sql);
      },
      withExclusiveTransactionAsync: async () => undefined,
      closeAsync: async () => {
        handle.closed = true;
      },
    };
  },
}));

const mockMigrate = jest.fn(async () => 7);
jest.mock('./migrate', () => ({ migrate: () => mockMigrate() }));

jest.mock('@/config/app-config', () => ({ APP_CONFIG: { content: { version: 13 } } }));

/** A fresh copy of the module (its shared "opening" run starts empty), as at an app start. */
function freshStart(): typeof import('./open-databases') {
  let mod!: typeof import('./open-databases');
  jest.isolateModules(() => {
    mod = jest.requireActual('./open-databases');
  });
  return mod;
}

const installed = (name: string) => mockFiles.get(`${SQLITE}/${name}`);

beforeEach(() => {
  mockFiles.clear();
  mockDirs.clear();
  mockLog.length = 0;
  mockOpened.length = 0;
  mockAsset.downloads = 0;
  mockMigrate.mockReset().mockResolvedValue(7);
  mockFiles.set(ASSET_COPY, 'content:v13');
});

describe('the app start', () => {
  it('first start: copies the content under a temporary name, then renames it', async () => {
    await freshStart().openAppDatabases();
    expect(installed('content-v13.db')).toBe('content:v13');
    expect(installed('content-v13.db.tmp')).toBeUndefined();
    expect(mockLog).toEqual(
      expect.arrayContaining([
        'copy ExponentAsset-abc.db → content-v13.db.tmp',
        'rename content-v13.db.tmp → content-v13.db',
      ]),
    );
  });

  it('opens the user database in WAL mode and runs its migrations', async () => {
    const dbs = await freshStart().openAppDatabases();
    expect(dbs.user).toBeDefined();
    const user = mockOpened.find((d) => d.name === 'user.db')!;
    expect(user.exec).toContain('PRAGMA journal_mode = WAL;');
    expect(mockMigrate).toHaveBeenCalled();
  });

  it('once the content is in place, deletes expo-asset’s cached copy (4.6 MB)', async () => {
    await freshStart().openAppDatabases();
    expect(mockFiles.has(ASSET_COPY)).toBe(false);
  });

  it('a healthy copy of this version is kept (nothing copied again)', async () => {
    mockFiles.set(`${SQLITE}/content-v13.db`, 'content:v13');
    await freshStart().openAppDatabases();
    expect(mockAsset.downloads).toBe(0);
  });

  it('a damaged copy is copied again', async () => {
    mockFiles.set(`${SQLITE}/content-v13.db`, 'half a file');
    const dbs = await freshStart().openAppDatabases();
    expect(dbs.content).toBeDefined();
    expect(installed('content-v13.db')).toBe('content:v13');
  });

  it('older content versions are removed; the user database is never touched', async () => {
    mockFiles.set(`${SQLITE}/content-v12.db`, 'content:v12');
    mockFiles.set(`${SQLITE}/user.db`, 'the user’s data');
    await freshStart().openAppDatabases();
    expect(installed('content-v12.db')).toBeUndefined();
    expect(installed('user.db')).toBe('the user’s data');
  });

  it('two starts at once share one run (the file is copied once)', async () => {
    const { openAppDatabases } = freshStart();
    const [a, b] = await Promise.all([openAppDatabases(), openAppDatabases()]);
    expect(a).toBe(b);
    expect(mockAsset.downloads).toBe(1);
  });
});

describe('the app start when something fails', () => {
  it('the user database cannot be migrated: both are closed, and the error is shown', async () => {
    mockMigrate.mockRejectedValueOnce(new Error('disk full'));
    await expect(freshStart().openAppDatabases()).rejects.toThrow('disk full');
    expect(mockOpened.every((d) => d.closed)).toBe(true);
  });

  it('the content stays damaged after a fresh copy: the user database is closed again', async () => {
    mockFiles.set(ASSET_COPY, 'not a database');
    await expect(freshStart().openAppDatabases()).rejects.toThrow(/damaged after a fresh copy/);
    expect(mockOpened.find((d) => d.name === 'user.db')!.closed).toBe(true);
  });

  it('a retry after a failure starts again (and can succeed)', async () => {
    const { openAppDatabases } = freshStart();
    mockMigrate.mockRejectedValueOnce(new Error('busy'));
    await expect(openAppDatabases()).rejects.toThrow('busy');
    const dbs: AppDatabases = await openAppDatabases();
    expect(dbs.user).toBeDefined();
  });
});

describe('database files', () => {
  it('sqlitePath: the plain path SQL needs (VACUUM INTO, ATTACH), not a file:// URI', () => {
    expect(freshStart().sqlitePath('backup 1.db')).toBe('/data/SQLite/backup 1.db');
  });

  it('removeDatabaseFiles: the database and its side files', async () => {
    for (const s of ['', '-wal', '-shm', '-journal', '.tmp']) {
      mockFiles.set(`${SQLITE}/old.db${s}`, 'x');
    }
    mockFiles.set(`${SQLITE}/other.db`, 'x');
    await freshStart().removeDatabaseFiles('old.db');
    expect([...mockFiles.keys()].filter((k) => k.startsWith(SQLITE))).toEqual([
      `${SQLITE}/other.db`,
    ]);
  });
});
