import { DEFAULT_SETTINGS } from '@/data/settings/settings';
import { createUserDb } from '@/test-utils/databases';

import { SettingsRepository } from './settings-repository';

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
