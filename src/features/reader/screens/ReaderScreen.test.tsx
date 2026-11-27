import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { counterStore } from '@/features/reader/state/counter-store';
import { CATEGORY, DHIKR } from '@/test-utils/fixtures/content';
import { ticksHeard } from '@/test-utils/mocks/audio';
import { mockRouter, setRouteParams } from '@/test-utils/mocks/router';
import { counted, openChapter, openReader, position, tapCounter } from '@/test-utils/reader';
import { renderWithApp } from '@/test-utils/render-app';
import { tr } from '@/test-utils/tr';

import { ReaderScreen } from './ReaderScreen';

const completeButton = () => screen.getByLabelText(tr('reader.completeLabel'));
const finishScreenOf = (categoryId: number) => ({
  pathname: '/category/[id]/done',
  params: { id: String(categoryId) },
});

describe('ReaderScreen', () => {
  it('shows the chapter, the place and an empty counter', async () => {
    const { adhkar, repos } = await openChapter(CATEGORY.firstListed);
    const title = (await repos.content.getCategory(CATEGORY.firstListed, 'ar'))!.title;
    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByText(position(1, adhkar.length))).toBeOnTheScreen();
    expect(screen.getByLabelText(counted(0, adhkar[0]!.count))).toBeOnTheScreen();
  });

  it('opens at the dhikr of the link', async () => {
    const { placeOf } = await openReader(DHIKR.hundredTimes);
    expect(screen.getByText(placeOf(DHIKR.hundredTimes))).toBeOnTheScreen();
  });

  it('counts each tap, with a light vibration', async () => {
    await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await tapCounter();
    expect(screen.getByLabelText(counted(2, 100))).toBeOnTheScreen();
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('«إعادة عدّ هذا الذكر» puts this dhikr back to zero', async () => {
    await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await fireEvent.press(screen.getByLabelText(tr('reader.reset')));
    expect(screen.getByLabelText(counted(0, 100))).toBeOnTheScreen();
  });

  it('plays no tick sound by default', async () => {
    await openReader(DHIKR.hundredTimes);
    await tapCounter();
    expect(ticksHeard()).toBe(0);
  });

  it('plays a short tick on each count when the setting is on', async () => {
    await openReader(DHIKR.hundredTimes, {
      setup: (repos) => repos.settings.set('tickSound', true),
    });
    await tapCounter();
    await tapCounter();
    await waitFor(() => expect(ticksHeard()).toBe(2));
  });

  it('moves to the next dhikr by itself when the count is reached', async () => {
    const { adhkar } = await openChapter(CATEGORY.morning); // the opening: count 1
    expect(adhkar[0]!.count).toBe(1);
    await tapCounter();
    await waitFor(() => expect(screen.getByText(position(2, adhkar.length))).toBeOnTheScreen(), {
      timeout: 2000,
    });
  });

  it('never counts past the target', async () => {
    await openReader(DHIKR.ayatAlKursi); // count 1
    await tapCounter();
    await tapCounter(); // during the pause before moving on
    expect(counterStore.get(DHIKR.ayatAlKursi)).toBe(1);
  });

  it('opens the finish screen when the whole chapter is done', async () => {
    await openChapter(CATEGORY.oneDhikr);
    await tapCounter();
    await waitFor(
      () => expect(mockRouter.replace).toHaveBeenCalledWith(finishScreenOf(CATEGORY.oneDhikr)),
      { timeout: 2000 },
    );
  });

  it('starts the chapter from zero after leaving the reader', async () => {
    const { view } = await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await view.unmount();
    setRouteParams({ id: String(CATEGORY.morning), dhikr: String(DHIKR.hundredTimes) });
    await renderWithApp(<ReaderScreen />);
    expect(await screen.findByLabelText(counted(0, 100))).toBeOnTheScreen();
  });

  it('«إتمام» fills the count and moves to the next dhikr', async () => {
    const { adhkar, placeOf } = await openReader(DHIKR.hundredTimes);
    await tapCounter();
    await fireEvent.press(completeButton());
    expect(screen.getByLabelText(counted(100, 100))).toBeOnTheScreen();
    expect(completeButton()).toBeDisabled();
    const next = adhkar[adhkar.findIndex((d) => d.id === DHIKR.hundredTimes) + 1]!;
    await waitFor(() => expect(screen.getByText(placeOf(next.id))).toBeOnTheScreen(), {
      timeout: 2000,
    });
  });

  it('«إتمام» on the last open dhikr opens the finish screen', async () => {
    await openChapter(CATEGORY.oneDhikr);
    await fireEvent.press(completeButton());
    await waitFor(
      () => expect(mockRouter.replace).toHaveBeenCalledWith(finishScreenOf(CATEGORY.oneDhikr)),
      { timeout: 2000 },
    );
  });

  it('goes to the dhikr of a new link while the same chapter is open (owner, 2026-11-27)', async () => {
    const { view, placeOf } = await openReader(DHIKR.hundredTimes);
    // The link's dhikr is used once, then cleared, so the same link works again.
    expect(mockRouter.setParams).toHaveBeenCalledWith({ dhikr: '' });
    // wirduk://category/1?dhikr=1002
    setRouteParams({ id: String(CATEGORY.morning), dhikr: String(DHIKR.threeQuls) });
    await view.rerender(<ReaderScreen />);
    expect(await screen.findByText(placeOf(DHIKR.threeQuls))).toBeOnTheScreen();
  });

  it('shows a message for an unknown chapter', async () => {
    setRouteParams({ id: '99999' });
    await renderWithApp(<ReaderScreen />);
    expect(await screen.findByText(tr('reader.notFound'))).toBeOnTheScreen();
  });
});
