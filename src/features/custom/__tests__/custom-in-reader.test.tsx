/** Reading the user's own adhkar in the reader. */
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { newAppStart } from '@/features/reader/hooks/useSessionRestore';
import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { counterStore } from '@/features/reader/state/counter-store';
import { captureAppState } from '@/test-utils/app-state';
import { position } from '@/test-utils/reader';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

async function withCategory(title = 'أدعيتي') {
  const repos = await createTestRepositories();
  const category = await repos.custom.createCategory(title);
  return { repos, category };
}

describe('Reading own adhkar', () => {
  it('counts an own dhikr like any other, shows the "أذكاري" label and an edit button', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'أستغفر الله', count: 3 });
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<ReaderScreen />, repos);
    const counter = await screen.findByLabelText('تم 0 من 3');
    await fireEvent(counter, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(screen.getByLabelText('تم 1 من 3')).toBeOnTheScreen();
    expect(screen.getByText(tr('custom.section'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText(tr('custom.editCategoryTitle')));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]',
      params: { id: String(category.id) },
    });
  });

  it('offers to add a dhikr to an empty own category', async () => {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<ReaderScreen />, repos);
    expect(await screen.findByText(tr('custom.noAdhkar'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(tr('custom.addDhikr')));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(category.id), dhikrId: 'new' },
    });
  });
});

describe('Reading own adhkar: «بلا حد» (owner, 2026-11-27)', () => {
  /** What TalkBack reads on the counter of an unlimited dhikr («تم 5، بلا حد»). */
  const counted = (done: number) => tr('reader.counterUnlimited', { done });
  const completeButton = () => screen.getByLabelText(tr('reader.completeLabel'));
  const tap = async (times = 1) => {
    for (let i = 0; i < times; i++) {
      await fireEvent(screen.getByLabelText(/^تم \d+، /), 'accessibilityAction', {
        nativeEvent: { actionName: 'activate' },
      });
    }
  };

  /** An own chapter: an unlimited dhikr (its kept number: 3), then, if `more`, one of 3. */
  async function openUnlimited({ more = true }: { more?: boolean } = {}) {
    const r = await createTestRepositories();
    const category = await r.custom.createCategory('أدعيتي');
    const d = await r.custom.createDhikr(category.id, { text: 'نص', count: 3, unlimited: true });
    if (more) await r.custom.createDhikr(category.id, { text: 'نص آخر', count: 3 });
    counterStore.resetMany([d.id, d.id - 1]); // counts are app-wide memory
    setRouteParams({ id: String(category.id) });
    const view = await renderWithApp(<ReaderScreen />, r);
    await screen.findByLabelText(counted(0));
    return { repos: r, category, dhikr: d, view };
  }

  it('the number only, no «من 3»; taps go past 3 and it stays on its page', async () => {
    await openUnlimited();
    await tap(5);
    expect(screen.getByLabelText(counted(5))).toBeOnTheScreen();
    expect(screen.getByText('5')).toBeOnTheScreen();
    expect(screen.queryByText(tr('reader.of', { total: 3 }))).toBeNull();
    expect(screen.getByText(position(1, 2))).toBeOnTheScreen();
    expect(completeButton()).not.toBeDisabled();
  });

  it('«إتمام» keeps its number, marks it done, and moves to the next dhikr', async () => {
    await openUnlimited();
    await tap(2);
    await fireEvent.press(completeButton());
    expect(screen.getByLabelText(counted(2))).toBeOnTheScreen();
    expect(completeButton()).toBeDisabled();
    await waitFor(() => expect(screen.getByText(position(2, 2))).toBeOnTheScreen(), {
      timeout: 2000,
    });
  });

  it('a chapter of it alone finishes only with «إتمام»', async () => {
    const { category } = await openUnlimited({ more: false });
    await tap(10);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.press(completeButton());
    await waitFor(
      () =>
        expect(mockRouter.replace).toHaveBeenCalledWith({
          pathname: '/category/[id]/done',
          params: { id: String(category.id) },
        }),
      { timeout: 2000 },
    );
  });

  it('«إعادة عدّ هذا الذكر» puts it back to 0', async () => {
    await openUnlimited();
    await tap(3);
    await fireEvent.press(screen.getByLabelText(tr('reader.reset')));
    expect(screen.getByLabelText(counted(0))).toBeOnTheScreen();
  });

  it('"continue where I stopped" keeps its count and that it was done', async () => {
    const appState = captureAppState();
    try {
      const { repos, category, dhikr, view } = await openUnlimited();
      await tap(40);
      await fireEvent.press(completeButton());
      await waitFor(() => expect(screen.getByText(position(2, 2))).toBeOnTheScreen(), {
        timeout: 2000,
      });
      await appState.send('background');
      await waitFor(async () =>
        expect(await repos.session.load()).toMatchObject({
          categoryId: category.id,
          counts: { [dhikr.id]: 40 },
          done: [dhikr.id],
        }),
      );
      // The app is closed (the reader with it), then opened again: Home puts it back.
      await view.unmount();
      expect(counterStore.get(dhikr.id)).toBe(0);
      newAppStart();
      await renderWithApp(<HomeScreen />, repos);
      await waitFor(() => expect(counterStore.get(dhikr.id)).toBe(40));
      expect(counterStore.isComplete(dhikr)).toBe(true);
      await settleLists();
    } finally {
      appState.restore();
    }
  });
});
