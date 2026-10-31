import type { AudioFileInfo } from '@/data/models';
import { DownloadedAudioRepository } from '@/data/repositories/user-repositories';
import { createUserDb } from '@/test-utils/databases';

import { AudioDownloads, type AudioStorage } from './audio-downloads';
import { STORAGE_MARGIN_BYTES, audioFileName } from './audio-plan';

const BASE = 'https://example.org/audio';
const MB = 1024 * 1024;

const FILES: AudioFileInfo[] = [
  { lang: 'ar', fileName: '1', bytes: 100 },
  { lang: 'ar', fileName: '2', bytes: 200 },
  { lang: 'ar', fileName: '3', bytes: 300 },
  { lang: 'ar', fileName: 'ar_7esn_AlMoslem_by_Doors_053', bytes: 400 },
];

/** Phone storage in memory. `serve` decides what a download writes, or throws. */
class FakeStorage implements AudioStorage {
  files = new Map<string, number>();
  unfinished = new Set<string>();
  free = 1000 * MB;
  downloads: string[] = [];
  serve: (url: string) => Promise<number> = async (url) => {
    const name = decodeURIComponent(
      url
        .split('/')
        .pop()!
        .replace(/\.mp3$/, ''),
    );
    return FILES.find((f) => f.fileName === name)!.bytes;
  };

  fileSize(lang: string, name: string) {
    return this.files.get(`${lang}/${name}`) ?? 0;
  }
  uri(lang: string, name: string) {
    return `file:///docs/audio/${lang}/${name}.mp3`;
  }
  async download(url: string, lang: string, name: string, signal?: AbortSignal) {
    this.downloads.push(url);
    const bytes = await this.serve(url);
    if (signal?.aborted) {
      const e = new Error('aborted');
      e.name = 'AbortError';
      throw e;
    }
    this.files.set(`${lang}/${name}`, bytes);
  }
  remove(lang: string, name: string) {
    this.files.delete(`${lang}/${name}`);
  }
  removeAll(lang: string) {
    for (const key of [...this.files.keys()])
      if (key.startsWith(`${lang}/`)) this.files.delete(key);
  }
  removeUnfinished(lang: string) {
    for (const key of [...this.unfinished])
      if (key.startsWith(`${lang}/`)) this.unfinished.delete(key);
  }
  freeBytes() {
    return this.free;
  }
}

/** The category of each file's dhikr (the morning category is 1). */
const CATEGORY: Record<string, number> = {
  '1': 1,
  '2': 1,
  '3': 7,
  ar_7esn_AlMoslem_by_Doors_053: 9,
};

async function setup() {
  const storage = new FakeStorage();
  const registry = new DownloadedAudioRepository(await createUserDb());
  const catalog = {
    listAudioFiles: async (lang: string, categoryIds?: readonly number[]) =>
      FILES.filter(
        (f) => f.lang === lang && (!categoryIds || categoryIds.includes(CATEGORY[f.fileName]!)),
      ),
    getAudioFile: async (lang: string, name: string) =>
      FILES.find((f) => f.lang === lang && f.fileName === name) ?? null,
  };
  const downloads = new AudioDownloads({
    storage,
    registry,
    catalog,
    baseUrl: BASE,
    extension: 'mp3',
    maxParallel: 2,
  });
  return { storage, registry, downloads };
}

describe("the owner's recordings keep their own extension (m4a, milestone 11)", () => {
  it('a name with an extension is used as it is; the book names get .mp3', async () => {
    expect(audioFileName('75', 'mp3')).toBe('75.mp3');
    expect(audioFileName('ar_7esn_AlMoslem_by_Doors_053', 'mp3')).toBe(
      'ar_7esn_AlMoslem_by_Doors_053.mp3',
    );
    expect(audioFileName('1001.m4a', 'mp3')).toBe('1001.m4a');
    const { downloads } = await setup();
    expect(downloads.url('ar', '1001.m4a')).toBe(`${BASE}/ar/1001.m4a`);
    expect(downloads.url('ar', '75')).toBe(`${BASE}/ar/75.mp3`);
  });
});

describe('AudioDownloads — one file', () => {
  it('downloads on first use, registers it, then uses the local copy', async () => {
    const { storage, registry, downloads } = await setup();
    expect(await downloads.localUri('ar', '2')).toBeNull();
    expect(await downloads.ensure('ar', '2')).toBe('file:///docs/audio/ar/2.mp3');
    expect(storage.downloads).toEqual([`${BASE}/ar/2.mp3`]);
    expect((await registry.find('ar', '2'))?.bytes).toBe(200);
    await downloads.ensure('ar', '2');
    expect(storage.downloads).toHaveLength(1);
    expect(await downloads.localUri('ar', '2')).toBe('file:///docs/audio/ar/2.mp3');
  });

  it('shares one download between two requests for the same file', async () => {
    const { storage, downloads } = await setup();
    await Promise.all([downloads.ensure('ar', '1'), downloads.ensure('ar', '1')]);
    expect(storage.downloads).toHaveLength(1);
  });

  it('never keeps a file with the wrong size (an error page, a cut file)', async () => {
    const { storage, registry, downloads } = await setup();
    storage.serve = async () => 42;
    await expect(downloads.ensure('ar', '3')).rejects.toMatchObject({ kind: 'failed' });
    expect(storage.fileSize('ar', '3')).toBe(0);
    expect(await registry.find('ar', '3')).toBeNull();
  });

  it('reports no connection clearly', async () => {
    const { storage, downloads } = await setup();
    storage.serve = async () => {
      throw new Error('java.net.UnknownHostException: Unable to resolve host');
    };
    await expect(downloads.ensure('ar', '1')).rejects.toMatchObject({ kind: 'offline' });
  });

  it('refuses when the phone is almost full', async () => {
    const { storage, downloads } = await setup();
    storage.free = STORAGE_MARGIN_BYTES;
    await expect(downloads.ensure('ar', '1')).rejects.toMatchObject({ kind: 'storage' });
    expect(storage.downloads).toEqual([]);
  });

  it('builds safe URLs', async () => {
    const { downloads } = await setup();
    expect(downloads.url('ar', 'ar_7esn_AlMoslem_by_Doors_053')).toBe(
      `${BASE}/ar/ar_7esn_AlMoslem_by_Doors_053.mp3`,
    );
    expect(downloads.url('ar', 'a b')).toBe(`${BASE}/ar/a%20b.mp3`);
  });
});

describe('AudioDownloads — status and registry', () => {
  it('corrects the registry when it disagrees with the files', async () => {
    const { storage, registry, downloads } = await setup();
    await registry.save('ar', '1', 100); // file was deleted by the system
    storage.files.set('ar/2', 200); // file is there but was never registered
    storage.files.set('ar/3', 10); // cut file
    const plan = await downloads.status('ar');
    expect(plan.downloadedFiles).toBe(1);
    expect(plan.missing.map((f) => f.fileName)).toEqual([
      '1',
      '3',
      'ar_7esn_AlMoslem_by_Doors_053',
    ]);
    expect((await registry.list('ar')).map((r) => r.fileName)).toEqual(['2']);
  });
});

describe('AudioDownloads — download all', () => {
  it('downloads only what is missing, with progress', async () => {
    const { storage, downloads } = await setup();
    storage.files.set('ar/1', 100);
    const progress: number[] = [];
    const plan = await downloads.downloadAll('ar', {
      onProgress: (p) => progress.push(p.doneBytes),
    });
    expect(plan.missing).toEqual([]);
    expect(plan.downloadedBytes).toBe(1000);
    expect(storage.downloads).toHaveLength(3);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(900);
  });

  it('can be cancelled, and continues where it stopped next time', async () => {
    const { storage, downloads } = await setup();
    const controller = new AbortController();
    // The user taps "cancel" as soon as the first file is done; files still
    // downloading at that moment are cancelled too.
    await expect(
      downloads.downloadAll('ar', {
        signal: controller.signal,
        onProgress: (p) => {
          if (p.doneFiles === 1) controller.abort();
        },
      }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    const after = await downloads.status('ar');
    expect(after.downloadedFiles).toBeGreaterThan(0);
    expect(after.downloadedFiles).toBeLessThan(4);

    storage.downloads = [];
    const done = await downloads.downloadAll('ar', {});
    expect(done.missing).toEqual([]);
    expect(storage.downloads).toHaveLength(4 - after.downloadedFiles);
  });

  it('checks the free space for everything before starting', async () => {
    const { storage, downloads } = await setup();
    storage.free = STORAGE_MARGIN_BYTES + 500;
    await expect(downloads.downloadAll('ar', {})).rejects.toMatchObject({ kind: 'storage' });
    expect(storage.downloads).toEqual([]);
  });

  it('stops at the first network failure with a clear reason', async () => {
    const { storage, downloads } = await setup();
    storage.serve = async () => {
      throw new Error('Failed to connect to tameemhabash.github.io');
    };
    await expect(downloads.downloadAll('ar', {})).rejects.toMatchObject({ kind: 'offline' });
  });

  it('can take only the adhkar of some categories (the morning and evening download)', async () => {
    const { storage, downloads } = await setup();
    const before = await downloads.status('ar', [1]);
    expect([before.totalFiles, before.totalBytes]).toEqual([2, 300]);
    const plan = await downloads.downloadAll('ar', { categoryIds: [1] });
    expect(storage.downloads.map((u) => u.split('/').pop())).toEqual(['1.mp3', '2.mp3']);
    expect([plan.downloadedFiles, plan.missing.length]).toEqual([2, 0]);
    // The others are still to download.
    expect((await downloads.status('ar')).missing.map((f) => f.fileName)).toEqual([
      '3',
      'ar_7esn_AlMoslem_by_Doors_053',
    ]);
  });

  it('deletes the downloaded recordings no dhikr plays any more (milestone 11)', async () => {
    const { storage, registry, downloads } = await setup();
    await downloads.downloadAll('ar', {});
    // An old recording still on the phone, which the content no longer lists.
    storage.files.set('ar/75', 999);
    await registry.save('ar', '75', 999);
    expect(await downloads.removeUnused('ar')).toBe(1);
    expect(storage.fileSize('ar', '75')).toBe(0);
    expect((await registry.list('ar')).map((r) => r.fileName)).not.toContain('75');
    expect((await downloads.status('ar')).missing).toEqual([]);
    expect(await downloads.removeUnused('ar')).toBe(0);
  });

  it('deletes everything of the language', async () => {
    const { storage, registry, downloads } = await setup();
    await downloads.downloadAll('ar', {});
    await downloads.deleteAll('ar');
    expect(storage.files.size).toBe(0);
    expect(await registry.list('ar')).toEqual([]);
    expect((await downloads.status('ar')).downloadedFiles).toBe(0);
  });
});
