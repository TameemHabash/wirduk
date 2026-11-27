import { fakeClock } from '@/test-utils/clock';
import { createUserDb } from '@/test-utils/databases';

import { DownloadedAudioRepository } from './downloaded-audio-repository';

describe('DownloadedAudioRepository', () => {
  it('saves, finds, totals and removes files per language', async () => {
    const repo = new DownloadedAudioRepository(await createUserDb(), fakeClock(500));
    await repo.save('ar', '75', 1000);
    await repo.save('ar', '76', 2000);
    await repo.save('en', '75', 300);
    expect(await repo.find('ar', '75')).toEqual({
      lang: 'ar',
      fileName: '75',
      bytes: 1000,
      downloadedAt: 500,
    });
    expect(await repo.totalBytes('ar')).toBe(3000);
    expect(await repo.totalBytes()).toBe(3300);
    await repo.remove('ar', '75');
    expect((await repo.list('ar')).map((f) => f.fileName)).toEqual(['76']);
  });

  it('removes all files of one language, or of every language', async () => {
    const repo = new DownloadedAudioRepository(await createUserDb());
    await repo.save('ar', 'a', 1);
    await repo.save('en', 'a', 1);
    await repo.removeAll('ar');
    expect(await repo.list('ar')).toEqual([]);
    expect(await repo.list('en')).toHaveLength(1);
    await repo.removeAll();
    expect(await repo.totalBytes()).toBe(0);
  });

  it('replaces the entry when a file is saved again', async () => {
    const repo = new DownloadedAudioRepository(await createUserDb());
    await repo.save('ar', 'a', 1);
    await repo.save('ar', 'a', 5);
    expect(await repo.list('ar')).toEqual([expect.objectContaining({ bytes: 5 })]);
  });
});
