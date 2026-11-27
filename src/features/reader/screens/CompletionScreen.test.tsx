import { StyleSheet, Vibration } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { counterStore } from '@/features/reader/state/counter-store';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/mocks/router';

import { CompletionScreen } from './CompletionScreen';
import { COLORS } from '@/theme/colors';
import { tr } from '@/test-utils/tr';

describe('CompletionScreen', () => {
  beforeEach(() => {
    setRouteParams({ id: '4' });
  });

  it('shows the blessing and the finished category', async () => {
    await renderWithApp(<CompletionScreen />);
    expect(screen.getByText(tr('completion.line1'))).toBeOnTheScreen();
    expect(screen.getByText(tr('completion.line2'))).toBeOnTheScreen();
    // The chapter's name without «», bold and teal (owner, 2026-11-25).
    expect(await screen.findByText('أتممت دعاء دخول الخلاء')).toBeOnTheScreen();
    expect(screen.queryByText(/«/)).toBeNull();
    expect(StyleSheet.flatten(screen.getByText('دعاء دخول الخلاء').props.style).color).toBe(
      COLORS.light.primaryInk,
    );
  });

  it('gives one long vibration for the whole category', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    await renderWithApp(<CompletionScreen />);
    await screen.findByText('أتممت دعاء دخول الخلاء');
    expect(vibrate).toHaveBeenCalledTimes(1);
    vibrate.mockRestore();
  });

  it('does not vibrate when the setting is off', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    const repos = await createTestRepositories();
    await repos.settings.set('completionVibration', false);
    await renderWithApp(<CompletionScreen />, repos);
    await screen.findByText('أتممت دعاء دخول الخلاء');
    expect(vibrate).not.toHaveBeenCalled();
    vibrate.mockRestore();
  });

  it('goes back home, so the category starts from zero when opened again', async () => {
    counterStore.tap({ id: 4001, count: 1 });
    await renderWithApp(<CompletionScreen />);
    await screen.findByText('أتممت دعاء دخول الخلاء');
    await fireEvent.press(screen.getByText(tr('completion.home')));
    expect(counterStore.get(4001)).toBe(0);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('starts the category again with fresh counters', async () => {
    counterStore.tap({ id: 4001, count: 1 });
    await renderWithApp(<CompletionScreen />);
    await screen.findByText('أتممت دعاء دخول الخلاء');
    await fireEvent.press(screen.getByText(tr('completion.again')));
    expect(counterStore.get(4001)).toBe(0);
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '4' },
    });
  });
});
