/** Main Settings: the one «أدومها» row, and the reminders it takes over while on. */
import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { givenAdwamuha } from '@/test-utils/given';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

const at = (hh: number) => () => new Date(2026, 2, 4, hh, 0);

// Home's list draws more rows on a timer: let it finish inside the test.
afterEach(async () => {
  await settleLists();
});

describe('Settings → «أدومها»', () => {
  it('comes first, as one row that opens its own screen', async () => {
    await renderWithApp(<SettingsScreen />, undefined, { now: at(9) });
    const off = await screen.findByText(tr('adwamuha.settings.off'));
    await fireEvent.press(off);
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/settings');
    // The reminders stay in Settings while «أدومها» is off.
    expect(screen.getByText(tr('settings.morningReminder'))).toBeOnTheScreen();
  });

  // A layout guard, not a look: on a Galaxy S21+ a label as wide as measured lost its last
  // word (owner, 2026-10-30; CLAUDE.md, "Traps"). Jest has no layout to show the cut.
  it('gives «غير مفعّلة» more room than measured', async () => {
    await renderWithApp(<SettingsScreen />, undefined, { now: at(9) });
    const off = await screen.findByText(tr('adwamuha.settings.off'));
    await fireEvent(off, 'layout', { nativeEvent: { layout: { width: 70, height: 20 } } });
    const style = StyleSheet.flatten(screen.getByText(tr('adwamuha.settings.off')).props.style);
    expect(style.minWidth).toBeGreaterThan(70);
  });

  it('while on, Settings no longer has the reminders (they are in «أدومها»)', async () => {
    const repos = await givenAdwamuha(await createTestRepositories(), {
      step: 2,
      startedOn: '2026-02-22',
    });
    await renderWithApp(<SettingsScreen />, repos, { now: at(9) });
    expect(await screen.findByText(tr('adwamuha.settingsScreen.enabled'))).toBeOnTheScreen();
    expect(screen.queryByText(tr('settings.morningReminder'))).toBeNull();
  });
});
