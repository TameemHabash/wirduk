import { shouldShowBackupNote } from './backup-note';

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;
const base = {
  now,
  dataSince: 10 * DAY,
  lastAutoBackupAt: null,
  fileSavedAt: null,
  noteShownAt: null,
};

describe('the gentle backup note on Home', () => {
  it('shows after 30 days with data and no backup of any kind', () => {
    expect(shouldShowBackupNote(base)).toBe(true);
    expect(shouldShowBackupNote({ ...base, dataSince: now - 29 * DAY })).toBe(false);
    expect(shouldShowBackupNote({ ...base, dataSince: null })).toBe(false);
  });

  it("not while Android's automatic backup is recent", () => {
    expect(shouldShowBackupNote({ ...base, lastAutoBackupAt: now - 2 * DAY })).toBe(false);
    expect(shouldShowBackupNote({ ...base, lastAutoBackupAt: now - 31 * DAY })).toBe(true);
  });

  it('not while a backup file is recent', () => {
    expect(shouldShowBackupNote({ ...base, fileSavedAt: now - 5 * DAY })).toBe(false);
    expect(shouldShowBackupNote({ ...base, fileSavedAt: now - 30 * DAY })).toBe(true);
  });

  it('once, then not again for 30 days', () => {
    expect(shouldShowBackupNote({ ...base, noteShownAt: now - 10 * DAY })).toBe(false);
    expect(shouldShowBackupNote({ ...base, noteShownAt: now - 30 * DAY })).toBe(true);
  });
});
