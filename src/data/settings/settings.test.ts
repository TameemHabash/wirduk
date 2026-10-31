import {
  DEFAULT_SETTINGS,
  DHIKR_FONT_SIZE,
  isSettingKey,
  isValidSetting,
  settingsFromStored,
  stepFontSize,
} from './settings';

describe('stepFontSize', () => {
  it('moves one step up or down', () => {
    expect(stepFontSize(24, 1)).toBe(26);
    expect(stepFontSize(24, -1)).toBe(22);
  });

  it('stays inside the allowed range', () => {
    expect(stepFontSize(DHIKR_FONT_SIZE.max, 1)).toBe(DHIKR_FONT_SIZE.max);
    expect(stepFontSize(DHIKR_FONT_SIZE.min, -1)).toBe(DHIKR_FONT_SIZE.min);
    expect(stepFontSize(DHIKR_FONT_SIZE.max - 1, 1)).toBe(DHIKR_FONT_SIZE.max);
  });
});

describe('settings', () => {
  it('has the brief defaults: haptics, background playback and autoplay on; reminders off', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      theme: 'system',
      hapticsEnabled: true,
      completionVibration: true,
      nextDhikrVibration: true,
      keepScreenOn: true,
      restoreSession: true, // owner decision 2026-10-22: on by default
      tickSound: false, // owner decision: off by default
      backgroundPlayback: true,
      autoplayNext: true,
      audioCounts: true, // owner decision 2026-10-31: each play counts (it was off)
      dhikrFont: 'amiri-quran',
    });
    expect(DEFAULT_SETTINGS.morningReminder.enabled).toBe(false);
    expect(DEFAULT_SETTINGS.eveningReminder.enabled).toBe(false);
  });

  it('knows its keys', () => {
    expect(isSettingKey('theme')).toBe(true);
    expect(isSettingKey('constructor')).toBe(false);
  });

  it('validates values', () => {
    expect(isValidSetting('theme', 'dark')).toBe(true);
    expect(isValidSetting('theme', 'blue')).toBe(false);
    expect(isValidSetting('dhikrFontSize', 16)).toBe(true);
    expect(isValidSetting('dhikrFontSize', 15)).toBe(false);
    expect(isValidSetting('dhikrFontSize', Number.NaN)).toBe(false);
    expect(isValidSetting('morningReminder', { enabled: true, time: '23:59' })).toBe(true);
    expect(isValidSetting('morningReminder', { enabled: true, time: '7:00' })).toBe(false);
    expect(isValidSetting('morningReminder', null)).toBe(false);
    expect(isValidSetting('dhikrFont', 'scheherazade')).toBe(true);
    expect(isValidSetting('dhikrFont', 'uthmanic-hafs')).toBe(false); // not shipped (license)
  });

  it("Adwamuha's ward order: plan order by default (owner, 2026-10-29), or the category's", () => {
    expect(DEFAULT_SETTINGS.wardOrder).toBe('plan');
    expect(isValidSetting('wardOrder', 'category')).toBe(true);
    expect(isValidSetting('wardOrder', 'book')).toBe(false);
    expect(settingsFromStored([{ key: 'wardOrder', json: '"category"' }]).wardOrder).toBe(
      'category',
    );
    expect(settingsFromStored([{ key: 'wardOrder', json: '"x"' }]).wardOrder).toBe('plan');
  });

  it("Adwamuha's week start: Saturday by default (owner, 2026-10-30), any day of the week", () => {
    expect(DEFAULT_SETTINGS.weekStart).toBe(6);
    expect(isValidSetting('weekStart', 0)).toBe(true);
    expect(isValidSetting('weekStart', 5)).toBe(true);
    expect(isValidSetting('weekStart', 7)).toBe(false);
    expect(isValidSetting('weekStart', 1.5)).toBe(false);
    expect(isValidSetting('weekStart', '6')).toBe(false);
    expect(settingsFromStored([{ key: 'weekStart', json: '0' }]).weekStart).toBe(0);
    expect(settingsFromStored([{ key: 'weekStart', json: '9' }]).weekStart).toBe(6);
  });

  it("has Adwamuha's ward times (04:00, 12:00, 16:00, 00:00) and refuses times out of order", () => {
    expect(DEFAULT_SETTINGS.wardTimes).toEqual({
      morningStart: '04:00',
      morningOnTimeEnd: '12:00',
      eveningStart: '16:00',
      eveningOnTimeEnd: '00:00',
    });
    const t = DEFAULT_SETTINGS.wardTimes;
    expect(isValidSetting('wardTimes', { ...t, morningStart: '05:30' })).toBe(true);
    expect(isValidSetting('wardTimes', { ...t, eveningStart: '10:00' })).toBe(false);
    expect(isValidSetting('wardTimes', { ...t, eveningOnTimeEnd: '7:00' })).toBe(false);
    expect(isValidSetting('wardTimes', { morningStart: '04:00' })).toBe(false);
  });

  it('builds settings from stored rows, skipping bad ones', () => {
    const s = settingsFromStored([
      { key: 'theme', json: '"light"' },
      { key: 'hapticsEnabled', json: '{broken' },
      { key: 'dhikrFontSize', json: '"big"' },
      { key: 'unknown', json: '1' },
    ]);
    expect(s).toEqual({ ...DEFAULT_SETTINGS, theme: 'light' });
  });

  it('never shares nested default objects with the defaults', () => {
    const a = settingsFromStored([]);
    a.morningReminder.enabled = true;
    expect(DEFAULT_SETTINGS.morningReminder.enabled).toBe(false);
    expect(settingsFromStored([]).morningReminder.enabled).toBe(false);
  });
});
