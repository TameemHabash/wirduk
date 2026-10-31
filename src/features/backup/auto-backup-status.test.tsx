import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithApp } from '@/test-utils/render-app';

import * as auto from './auto-backup';
import { AutoBackupStatus } from './AutoBackupStatus';

// As on Android: the phone can tell when it last backed the app up.
jest.mock('./auto-backup', () => ({
  ...jest.requireActual('./auto-backup'),
  autoBackupKnown: true,
  openBackupSettings: jest.fn(),
}));
const openSettings = jest.mocked(auto.openBackupSettings);

const DAY = 24 * 60 * 60 * 1000;
const ENABLE = 'تفعيل النسخ الاحتياطي في الهاتف';

describe("Android's automatic backup, as the user sees it", () => {
  it('looks off when it never ran, or not for 30 days', () => {
    const now = 100 * DAY;
    expect(auto.autoBackupLooksOff(null, now)).toBe(true);
    expect(auto.autoBackupLooksOff(now - 30 * DAY, now)).toBe(true);
    expect(auto.autoBackupLooksOff(now - 2 * DAY, now)).toBe(false);
  });

  it('recent: its date, and no button', async () => {
    await renderWithApp(<AutoBackupStatus at={Date.now() - DAY} />);
    expect(await screen.findByText(/^آخر نسخ تلقائي من الهاتف/)).toBeOnTheScreen();
    expect(screen.queryByText(ENABLE)).toBeNull();
  });

  it("never: a button to the phone's backup settings", async () => {
    openSettings.mockResolvedValue('backup');
    await renderWithApp(<AutoBackupStatus at={null} />);
    expect(await screen.findByText(/^لم ينسخ الهاتف بيانات التطبيق/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(ENABLE));
    expect(openSettings).toHaveBeenCalled();
    expect(screen.queryByText('ابحث في إعدادات الهاتف عن «النسخ الاحتياطي» وفعّله.')).toBeNull();
  });

  it('a phone without that screen: its Settings open, and the app says what to look for', async () => {
    openSettings.mockResolvedValue('settings');
    await renderWithApp(<AutoBackupStatus at={Date.now() - 40 * DAY} />);
    await fireEvent.press(await screen.findByText(ENABLE));
    await waitFor(() =>
      expect(
        screen.getByText('ابحث في إعدادات الهاتف عن «النسخ الاحتياطي» وفعّله.'),
      ).toBeOnTheScreen(),
    );
  });
});
