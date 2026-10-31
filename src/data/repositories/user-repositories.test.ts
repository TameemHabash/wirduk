import { DEFAULT_SETTINGS } from '@/data/settings/settings';
import { createUserDb } from '@/test-utils/databases';

import {
  CategoryOrderRepository,
  DownloadedAudioRepository,
  FavoritesRepository,
  SettingsRepository,
} from './user-repositories';

/** A clock that moves forward 1 ms on every call. */
function fakeClock(start = 1_000) {
  let t = start;
  return () => t++;
}

describe('FavoritesRepository', () => {
  it('adds, lists in the order added, and removes', async () => {
    const repo = new FavoritesRepository(await createUserDb(), fakeClock());
    await repo.add(5);
    await repo.add(2);
    await repo.add(5); // already there
    expect(await repo.list()).toEqual([5, 2]);
    await repo.remove(5);
    expect(await repo.list()).toEqual([2]);
  });

  it('toggles and reports the new state', async () => {
    const repo = new FavoritesRepository(await createUserDb(), fakeClock());
    expect(await repo.toggle(7)).toBe(true);
    expect(await repo.toggle(7)).toBe(false);
    expect(await repo.list()).toEqual([]);
  });
});

describe('CategoryOrderRepository', () => {
  it('is empty (default order) at first', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    expect(await repo.get()).toEqual([]);
  });

  it('saves and replaces the full order', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    await repo.save([3, 1, 2]);
    expect(await repo.get()).toEqual([3, 1, 2]);
    await repo.save([2, 3]);
    expect(await repo.get()).toEqual([2, 3]);
  });

  it('rejects duplicates and keeps the old order', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    await repo.save([1, 2]);
    await expect(repo.save([1, 1])).rejects.toThrow(/duplicate/);
    expect(await repo.get()).toEqual([1, 2]);
  });

  it('resets to the default order', async () => {
    const repo = new CategoryOrderRepository(await createUserDb());
    await repo.save([2, 1]);
    await repo.reset();
    expect(await repo.get()).toEqual([]);
  });
});

describe('SettingsRepository', () => {
  it('returns the defaults when nothing is saved', async () => {
    const repo = new SettingsRepository(await createUserDb());
    expect(await repo.getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves and reads back values of every type', async () => {
    const repo = new SettingsRepository(await createUserDb());
    await repo.set('theme', 'dark');
    await repo.set('hapticsEnabled', false);
    await repo.set('dhikrFontSize', 30);
    await repo.set('morningReminder', { enabled: true, time: '05:30' });
    const s = await repo.getAll();
    expect(s.theme).toBe('dark');
    expect(s.hapticsEnabled).toBe(false);
    expect(s.dhikrFontSize).toBe(30);
    expect(s.morningReminder).toEqual({ enabled: true, time: '05:30' });
    expect(s.eveningReminder).toEqual(DEFAULT_SETTINGS.eveningReminder);
  });

  it('refuses invalid values', async () => {
    const repo = new SettingsRepository(await createUserDb());
    await expect(repo.set('dhikrFontSize', 500)).rejects.toThrow(/Invalid value/);
    await expect(repo.set('morningReminder', { enabled: true, time: '25:00' })).rejects.toThrow(
      /Invalid value/,
    );
  });

  it('ignores damaged stored values and unknown keys', async () => {
    const db = await createUserDb();
    db.raw.exec(`INSERT INTO Settings (Key, Value) VALUES
      ('theme', '"purple"'), ('hapticsEnabled', 'not json'), ('oldSetting', 'true')`);
    expect(await new SettingsRepository(db).getAll()).toEqual(DEFAULT_SETTINGS);
  });

  it('resets one setting to its default', async () => {
    const repo = new SettingsRepository(await createUserDb());
    await repo.set('autoplayNext', false);
    await repo.reset('autoplayNext');
    expect((await repo.getAll()).autoplayNext).toBe(true);
  });
});

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
