import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BackupError, type BackupSummary } from '@/data/backup/backup-db';
import { dismissDialog, openDialog, pressInDialog } from '@/test-utils/dialog';
import { givenAdwamuha } from '@/test-utils/given';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';

import { BackupNote } from '@/features/backup/components/BackupNote';
import { BackupSettings } from '@/features/backup/components/BackupSettings';
import * as files from '@/features/backup/services/backup-files';
import { tr } from '@/test-utils/tr';

jest.mock('@/features/backup/services/backup-files', () => ({
  makeBackupFile: jest.fn(),
  shareBackupFile: jest.fn(() => Promise.resolve()),
  pickBackupFile: jest.fn(),
  restorePickedBackup: jest.fn(() => Promise.resolve()),
  discardPickedBackup: jest.fn(() => Promise.resolve()),
}));
const mocked = jest.mocked(files);

const summary: BackupSummary = {
  format: 1,
  createdAt: new Date(2026, 9, 25, 10, 0).getTime(),
  appVersion: '1.0.0',
  favorites: 2,
  customCategories: 1,
  customAdhkar: 3,
  recordings: 1,
  recordingBytes: 1000,
  wardDays: 12,
  adwamuhaStep: 4,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Settings → «النسخ الاحتياطي»', () => {
  it('saves a file through the share sheet and shows its date', async () => {
    mocked.makeBackupFile.mockResolvedValue({
      uri: 'file:///cache/wirduk-backup-2026-10-25.wirduk',
      name: 'wirduk-backup-2026-10-25.wirduk',
      bytes: 2000,
      summary,
    });
    const repos = await createTestRepositories();
    await renderWithApp(<BackupSettings />, repos);
    expect(await screen.findByText(tr('backup.lastFileNever'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('backup.save')));
    expect(await screen.findByText('آخر نسخة في ملف: 25/10/2026')).toBeOnTheScreen();
    expect(mocked.shareBackupFile).toHaveBeenCalledWith(
      'file:///cache/wirduk-backup-2026-10-25.wirduk',
      tr('backup.shareTitle'),
    );
    expect(await repos.backup.fileSavedAt()).toBe(summary.createdAt);
  });

  it('says so when the file cannot be made', async () => {
    mocked.makeBackupFile.mockRejectedValue(new Error('disk full'));
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText(tr('backup.save')));
    expect(await screen.findByText(tr('backup.errors.saveFailed'))).toBeOnTheScreen();
  });

  it('restores a picked file after showing what is in it', async () => {
    mocked.pickBackupFile.mockResolvedValue(summary);
    const repos = await createTestRepositories();
    await renderWithApp(<BackupSettings />, repos);
    await fireEvent.press(await screen.findByText(tr('backup.restore')));
    await waitFor(() => expect(screen.getByTestId('dialog')).toBeOnTheScreen());
    expect(openDialog().getByText(tr('backup.confirmTitle'))).toBeOnTheScreen();
    expect(openDialog().getByText(/نسخة 25\/10\/2026/)).toBeOnTheScreen();
    expect(openDialog().getByText(/أذكارك الخاصة: 3/)).toBeOnTheScreen();
    expect(openDialog().getByText(/خطوتك في «أدومها»: 4/)).toBeOnTheScreen();
    await pressInDialog(tr('backup.confirm'));
    await waitFor(() =>
      expect(mocked.restorePickedBackup).toHaveBeenCalledWith(repos.backup, summary),
    );
  });

  it('cancelling leaves everything as it was', async () => {
    mocked.pickBackupFile.mockResolvedValue(summary);
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText(tr('backup.restore')));
    await pressInDialog(tr('common.cancel'));
    await waitFor(() => expect(mocked.discardPickedBackup).toHaveBeenCalled());
    expect(mocked.restorePickedBackup).not.toHaveBeenCalled();
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('a tap outside the dialog cancels too', async () => {
    mocked.pickBackupFile.mockResolvedValue(summary);
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText(tr('backup.restore')));
    await waitFor(() => expect(screen.getByTestId('dialog')).toBeOnTheScreen());
    await dismissDialog();
    await waitFor(() => expect(mocked.discardPickedBackup).toHaveBeenCalled());
    expect(mocked.restorePickedBackup).not.toHaveBeenCalled();
  });

  it.each([
    ['not-backup', tr('backup.errors.not-backup')],
    ['newer', tr('backup.errors.newer')],
    ['damaged', tr('backup.errors.damaged')],
  ] as const)('a %s file: a clear message, nothing changed', async (problem, message) => {
    mocked.pickBackupFile.mockRejectedValue(new BackupError(problem, 'x'));
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText(tr('backup.restore')));
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mocked.restorePickedBackup).not.toHaveBeenCalled();
  });
});

describe('the gentle note on Home', () => {
  const NOTE = /^مرّ أكثر من شهر دون نسخة احتياطية/;
  const now = () => new Date(2026, 9, 25).getTime();

  /** «أدومها» on since `startedOn`. */
  async function withAdwamuhaSince(startedOn: string) {
    return givenAdwamuha(await createTestRepositories(), { startedOn });
  }

  it('shows after 30 days with no backup, once', async () => {
    const repos = await withAdwamuhaSince('2026-09-01');
    await renderWithApp(<BackupNote now={now} />, repos);
    expect(await screen.findByText(NOTE)).toBeOnTheScreen();
    expect(await repos.backup.noteShownAt()).toBe(now());
    await fireEvent.press(screen.getByText(tr('backup.note.later')));
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  it('not before 30 days, nor with a recent backup file, nor without data', async () => {
    const recent = await withAdwamuhaSince('2026-10-10');
    await renderWithApp(<BackupNote now={now} />, recent);
    const saved = await withAdwamuhaSince('2026-09-01');
    await saved.backup.setFileSavedAt(new Date(2026, 9, 20).getTime());
    await renderWithApp(<BackupNote now={now} />, saved);
    await renderWithApp(<BackupNote now={now} />, await createTestRepositories());
    await waitFor(async () => expect(await saved.backup.dataSince()).not.toBeNull());
    expect(screen.queryByText(NOTE)).toBeNull();
    expect(await recent.backup.noteShownAt()).toBeNull();
  });
});
