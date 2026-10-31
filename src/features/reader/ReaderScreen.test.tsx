import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { counterStore } from '@/features/counter/counter-store';
import { mockPlayers, tickPlayer } from '@/test-utils/audio-mock';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { ReaderScreen } from './ReaderScreen';

/** The counter, found by its spoken label "تم N من M". */
const counter = () => screen.getByLabelText(/^تم \d+ من \d+$/);

/** What a screen-reader user does: activate the counter. */
async function tap() {
  await fireEvent(counter(), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
}

async function openCategory(id: number, dhikr?: number) {
  const repos = await createTestRepositories();
  const adhkar = await repos.content.listAdhkar(id, 'ar');
  counterStore.resetMany(adhkar.map((d) => d.id)); // counters are app-wide memory
  setRouteParams(dhikr ? { id: String(id), dhikr: String(dhikr) } : { id: String(id) });
  const view = await renderWithApp(<ReaderScreen />, repos);
  await screen.findByLabelText(/^تم \d+ من \d+$/);
  return { repos, adhkar, view };
}

const completeButton = () => screen.getByLabelText('إتمام هذا الذكر والانتقال إلى التالي');

describe('ReaderScreen', () => {
  it('shows the category, position and an empty counter', async () => {
    const { adhkar } = await openCategory(2);
    expect(screen.getByText('أذكار النوم')).toBeOnTheScreen();
    expect(screen.getByText(`1 من ${adhkar.length}`)).toBeOnTheScreen();
    expect(counter().props.accessibilityLabel).toBe(`تم 0 من ${adhkar[0]!.count}`);
  });

  it('counts, gives light haptic feedback, and resets this dhikr only', async () => {
    // أذكار الصباح, dhikr 17: سبحان الله وبحمده (100 times)
    await openCategory(1, 1017);
    expect(screen.getByText('18 من 24')).toBeOnTheScreen();
    await tap();
    await tap();
    expect(counter().props.accessibilityLabel).toBe('تم 2 من 100');
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('إعادة عدّ هذا الذكر'));
    expect(counter().props.accessibilityLabel).toBe('تم 0 من 100');
  });

  it('plays no tick sound by default', async () => {
    await openCategory(1, 1017);
    await tap();
    expect(mockPlayers.filter((p) => p.play.mock.calls.length > 0)).toEqual([]);
  });

  it('plays a short tick on each count when the setting is on', async () => {
    const repos = await createTestRepositories();
    await repos.settings.set('tickSound', true);
    counterStore.reset(1017);
    setRouteParams({ id: '1', dhikr: '1017' });
    await renderWithApp(<ReaderScreen />, repos);
    await screen.findByLabelText(/^تم \d+ من \d+$/);
    await tap();
    await tap();
    await waitFor(() => expect(tickPlayer()?.play).toHaveBeenCalledTimes(2));
  });

  it('moves to the next dhikr by itself when the count is reached', async () => {
    const { adhkar } = await openCategory(1); // first morning dhikr: count 1
    expect(adhkar[0]!.count).toBe(1);
    await tap();
    await waitFor(() => expect(screen.getByText('2 من 24')).toBeOnTheScreen(), { timeout: 2000 });
  });

  it('never counts past the target', async () => {
    await openCategory(1, 1001); // count 1
    await tap();
    await tap(); // during the pause before moving on
    expect(counterStore.get(1001)).toBe(1);
  });

  it('opens the completion screen when the whole category is done', async () => {
    await openCategory(4); // دعاء دخول الخلاء: one dhikr, count 1
    await tap();
    await waitFor(
      () =>
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/category/[id]/done',
          params: { id: '4' },
        }),
      { timeout: 2000 },
    );
  });

  it('starts the category from zero after leaving the reader', async () => {
    const { view } = await openCategory(1, 1017);
    await tap();
    expect(counter().props.accessibilityLabel).toBe('تم 1 من 100');
    await view.unmount();
    expect(counterStore.get(1017)).toBe(0);
    setRouteParams({ id: '1', dhikr: '1017' });
    await renderWithApp(<ReaderScreen />);
    expect(await screen.findByLabelText('تم 0 من 100')).toBeOnTheScreen();
  });

  it('"complete" fills the count and moves to the next dhikr', async () => {
    await openCategory(1, 1017); // سبحان الله وبحمده: 100 times
    await tap();
    await fireEvent.press(completeButton());
    expect(counterStore.get(1017)).toBe(100);
    expect(counter().props.accessibilityLabel).toBe('تم 100 من 100');
    expect(completeButton().props.accessibilityState).toMatchObject({ disabled: true });
    await waitFor(() => expect(screen.getByText('19 من 24')).toBeOnTheScreen(), {
      timeout: 2000,
    });
  });

  it('"complete" on the last open dhikr opens the completion screen', async () => {
    await openCategory(4); // one dhikr
    await fireEvent.press(completeButton());
    await waitFor(
      () =>
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/category/[id]/done',
          params: { id: '4' },
        }),
      { timeout: 2000 },
    );
  });

  it('shows a message for an unknown category', async () => {
    setRouteParams({ id: '99999' });
    await renderWithApp(<ReaderScreen />);
    expect(await screen.findByText('لم يُعثر على هذا الباب.')).toBeOnTheScreen();
  });
});
