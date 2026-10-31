import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { BackupError, type BackupSummary } from '@/data/backup/backup-db';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';

import { BackupNote } from './BackupNote';
import { BackupSettings } from './BackupSettings';
import * as files from './backup-files';

jest.mock('./backup-files', () => ({
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
    expect(await screen.findByText('لم تحفظ نسخة في ملف بعد.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('حفظ نسخة احتياطية'));
    expect(await screen.findByText('آخر نسخة في ملف: 25/10/2026')).toBeOnTheScreen();
    expect(mocked.shareBackupFile).toHaveBeenCalledWith(
      'file:///cache/wirduk-backup-2026-10-25.wirduk',
      'احفظ النسخة الاحتياطية في مكان آمن',
    );
    expect(await repos.backup.fileSavedAt()).toBe(summary.createdAt);
  });

  it('says so when the file cannot be made', async () => {
    mocked.makeBackupFile.mockRejectedValue(new Error('disk full'));
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText('حفظ نسخة احتياطية'));
    expect(await screen.findByText('تعذّر حفظ النسخة. حاول مرة أخرى.')).toBeOnTheScreen();
  });

  it('restores a picked file after showing what is in it', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mocked.pickBackupFile.mockResolvedValue(summary);
    const repos = await createTestRepositories();
    await renderWithApp(<BackupSettings />, repos);
    await fireEvent.press(await screen.findByText('استعادة نسخة احتياطية'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    const [title, body, buttons] = alert.mock.calls[0]!;
    expect(title).toBe('استعادة هذه النسخة؟');
    expect(body).toContain('نسخة 25/10/2026');
    expect(body).toContain('أذكارك الخاصة: 3');
    expect(body).toContain('خطوتك في «أدومها»: 4');
    const confirm = (buttons as AlertButton[]).find((b) => b.text === 'استعادة')!;
    await act(async () => confirm.onPress!());
    await waitFor(() =>
      expect(mocked.restorePickedBackup).toHaveBeenCalledWith(repos.backup, summary),
    );
    alert.mockRestore();
  });

  it('cancelling leaves everything as it was', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mocked.pickBackupFile.mockResolvedValue(summary);
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText('استعادة نسخة احتياطية'));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    const cancel = (alert.mock.calls[0]![2] as AlertButton[]).find((b) => b.style === 'cancel')!;
    await act(async () => cancel.onPress!());
    await waitFor(() => expect(mocked.discardPickedBackup).toHaveBeenCalled());
    expect(mocked.restorePickedBackup).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it.each([
    ['not-backup', 'هذا الملف ليس نسخة احتياطية من وِرْدُك.'],
    ['newer', 'هذه النسخة من إصدار أحدث من التطبيق. حدّث التطبيق ثم حاول مرة أخرى.'],
    ['damaged', 'الملف تالف ولا يمكن استعادته.'],
  ] as const)('a %s file: a clear message, nothing changed', async (problem, message) => {
    mocked.pickBackupFile.mockRejectedValue(new BackupError(problem, 'x'));
    await renderWithApp(<BackupSettings />);
    await fireEvent.press(await screen.findByText('استعادة نسخة احتياطية'));
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(mocked.restorePickedBackup).not.toHaveBeenCalled();
  });
});

describe('the gentle note on Home', () => {
  const NOTE = /^مرّ أكثر من شهر دون نسخة احتياطية/;
  const now = () => new Date(2026, 9, 25).getTime();

  /** «أدومها» on since `startedOn`. */
  async function withAdwamuhaSince(startedOn: string) {
    const repos = await createTestRepositories();
    await repos.adwamuha.save({
      enabled: true,
      plan: { opening: { morning: 1901, evening: 133901 }, steps: [] } as never,
      state: {} as never,
      startedOn,
      offSince: null,
    });
    return repos;
  }

  it('shows after 30 days with no backup, once', async () => {
    const repos = await withAdwamuhaSince('2026-09-01');
    await renderWithApp(<BackupNote now={now} />, repos);
    expect(await screen.findByText(NOTE)).toBeOnTheScreen();
    expect(await repos.backup.noteShownAt()).toBe(now());
    await fireEvent.press(screen.getByText('لاحقًا'));
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
