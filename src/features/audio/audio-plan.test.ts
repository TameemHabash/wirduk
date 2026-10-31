import {
  AudioDownloadError,
  classifyError,
  planDownloads,
  runPool,
  toMegabytes,
} from './audio-plan';

const file = (fileName: string, bytes: number) => ({ lang: 'ar', fileName, bytes });

describe('planDownloads', () => {
  it('counts what is downloaded and what is missing', () => {
    const plan = planDownloads([file('a', 100), file('b', 50), file('c', 25)], (n) => n === 'b');
    expect(plan).toMatchObject({
      totalFiles: 3,
      totalBytes: 175,
      downloadedFiles: 1,
      downloadedBytes: 50,
      missingBytes: 125,
    });
    expect(plan.missing.map((f) => f.fileName)).toEqual(['a', 'c']);
  });

  it('handles a language with no audio', () => {
    expect(planDownloads([], () => false)).toMatchObject({ totalFiles: 0, missing: [] });
  });
});

describe('toMegabytes', () => {
  it('shows one decimal below 10 MB and whole numbers above', () => {
    expect(toMegabytes(0)).toBe(0);
    expect(toMegabytes(1000)).toBe(0.1); // never shows 0 for a real file
    expect(toMegabytes(2.46 * 1024 * 1024)).toBe(2.5);
    expect(toMegabytes(116.4 * 1024 * 1024)).toBe(116);
  });
});

describe('classifyError', () => {
  it('recognizes no connection, full storage and cancel', () => {
    expect(classifyError(new Error('java.net.UnknownHostException: Unable to resolve host'))).toBe(
      'offline',
    );
    expect(classifyError(new Error('The Internet connection appears to be offline.'))).toBe(
      'offline',
    );
    expect(classifyError(new Error('ENOSPC: No space left on device'))).toBe('storage');
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    expect(classifyError(abort)).toBe('cancelled');
    expect(classifyError(new AudioDownloadError('storage'))).toBe('storage');
    expect(classifyError(new Error('HTTP 500'))).toBe('failed');
  });
});

describe('runPool', () => {
  it('never runs more than the limit at once and runs every item', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      done.push(n);
      running--;
    });
    expect(peak).toBe(3);
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('stops starting new items when cancelled', async () => {
    const controller = new AbortController();
    const started: number[] = [];
    const run = runPool(
      [1, 2, 3, 4, 5],
      1,
      async (n) => {
        started.push(n);
        if (n === 2) controller.abort();
        await Promise.resolve();
      },
      controller.signal,
    );
    await expect(run).rejects.toMatchObject({ kind: 'cancelled' });
    expect(started).toEqual([1, 2]);
  });

  it('stops after the first failure and reports it', async () => {
    const started: number[] = [];
    const run = runPool([1, 2, 3, 4], 1, async (n) => {
      started.push(n);
      if (n === 2) throw new AudioDownloadError('offline');
    });
    await expect(run).rejects.toMatchObject({ kind: 'offline' });
    expect(started).toEqual([1, 2]);
  });
});
