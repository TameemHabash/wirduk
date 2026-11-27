import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { dialogButtons, openDialog, pressInDialog } from '@/test-utils/dialog';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { left, mockRouter, tryToLeave } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

import { ReorderScreen } from './ReorderScreen';

jest.mock('react-native-reorderable-list', () => {
  const actual = jest.requireActual('react-native-reorderable-list');
  const { View } = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  // A plain list in tests; `onReorder` is called by the test (no gestures here).
  return {
    ...actual,
    __esModule: true,
    useReorderableDrag: () => () => undefined,
    useIsActive: () => false,
    default: ({ data, renderItem, onReorder }: never) => {
      (globalThis as { reorder?: unknown }).reorder = onReorder;
      return React.createElement(
        View,
        null,
        (data as unknown[]).map((item, index) =>
          React.createElement(View, { key: index }, (renderItem as Function)({ item, index })),
        ),
      );
    },
  };
});

const move = (from: number, to: number) =>
  act(async () => (globalThis as { reorder?: (e: object) => void }).reorder!({ from, to }));

describe('«تعديل الترتيب» (saved only with «حفظ»)', () => {
  it('the bar: close, the title, «حفظ» off until a change', async () => {
    await renderWithApp(<ReorderScreen />);
    expect(await screen.findByRole('header', { name: tr('home.editOrder') })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: tr('custom.save') })).toBeDisabled();
    expect(screen.getByLabelText('اسحب لتغيير ترتيب «أذكار النوم»')).toBeOnTheScreen();
  });

  it('a move is not saved before «حفظ»; «حفظ» saves and goes back', async () => {
    const repos = await createTestRepositories();
    await renderWithApp(<ReorderScreen />, repos);
    await screen.findByLabelText('اسحب لتغيير ترتيب «أذكار النوم»');
    await move(0, 1);
    expect(await repos.categoryOrder.get()).toEqual([]);
    await fireEvent.press(screen.getByRole('button', { name: tr('custom.save') }));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    const saved = await repos.categoryOrder.get();
    expect(saved?.slice(0, 2)).toEqual([3, 2]);
  });

  it('leaving with changes asks «تجاهل التغييرات؟»', async () => {
    await renderWithApp(<ReorderScreen />);
    await screen.findByLabelText('اسحب لتغيير ترتيب «أذكار النوم»');
    await move(0, 1);
    expect(await tryToLeave()).toBe(false);
    expect(openDialog().getByText(tr('custom.discardTitle'))).toBeOnTheScreen();
    // Keeping on is the main button (the safe one).
    expect(dialogButtons()).toEqual([tr('custom.keepEditing'), tr('custom.discard')]);
  });

  it('«تجاهل» leaves without saving', async () => {
    const repos = await createTestRepositories();
    await renderWithApp(<ReorderScreen />, repos);
    await screen.findByLabelText('اسحب لتغيير ترتيب «أذكار النوم»');
    await move(0, 1);
    await tryToLeave();
    await pressInDialog(tr('custom.discard'));
    expect(left).toEqual([{ type: 'GO_BACK' }]);
    expect(await repos.categoryOrder.get()).toEqual([]);
  });

  it('leaving with no change asks nothing', async () => {
    await renderWithApp(<ReorderScreen />);
    await screen.findByLabelText('اسحب لتغيير ترتيب «أذكار النوم»');
    expect(await tryToLeave()).toBe(true);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });

  it('«استعادة الترتيب الافتراضي» asks first, then restores and goes back', async () => {
    const repos = await createTestRepositories();
    await repos.categoryOrder.save([5, 4, 3, 2]);
    await renderWithApp(<ReorderScreen />, repos);
    await fireEvent.press(await screen.findByText(tr('home.restoreDefault')));
    expect(dialogButtons()).toEqual([tr('home.restore'), tr('common.cancel')]);
    await pressInDialog(tr('home.restore'));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await repos.categoryOrder.get()).toEqual([]);
  });
});
