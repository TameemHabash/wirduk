import { Vibration } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { counterStore } from '@/features/counter/counter-store';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { CompletionScreen } from './CompletionScreen';

describe('CompletionScreen', () => {
  beforeEach(() => {
    setRouteParams({ id: '4' });
  });

  it('shows the blessing and the finished category', async () => {
    await renderWithApp(<CompletionScreen />);
    expect(screen.getByText('بارك الله فيك')).toBeOnTheScreen();
    expect(screen.getByText('وتقبّل عملك')).toBeOnTheScreen();
    expect(await screen.findByText('أتممت «دعاء دخول الخلاء»')).toBeOnTheScreen();
  });

  it('gives one long vibration for the whole category', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    await renderWithApp(<CompletionScreen />);
    await screen.findByText('أتممت «دعاء دخول الخلاء»');
    expect(vibrate).toHaveBeenCalledTimes(1);
    vibrate.mockRestore();
  });

  it('does not vibrate when the setting is off', async () => {
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => undefined);
    const repos = await createTestRepositories();
    await repos.settings.set('completionVibration', false);
    await renderWithApp(<CompletionScreen />, repos);
    await screen.findByText('أتممت «دعاء دخول الخلاء»');
    expect(vibrate).not.toHaveBeenCalled();
    vibrate.mockRestore();
  });

  it('goes back home, so the category starts from zero when opened again', async () => {
    counterStore.tap(4001, 1);
    await renderWithApp(<CompletionScreen />);
    await screen.findByText('أتممت «دعاء دخول الخلاء»');
    await fireEvent.press(screen.getByText('العودة إلى الرئيسية'));
    expect(counterStore.get(4001)).toBe(0);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });

  it('starts the category again with fresh counters', async () => {
    counterStore.tap(4001, 1);
    await renderWithApp(<CompletionScreen />);
    await screen.findByText('أتممت «دعاء دخول الخلاء»');
    await fireEvent.press(screen.getByText('إعادة الأذكار'));
    expect(counterStore.get(4001)).toBe(0);
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '4' },
    });
  });
});
