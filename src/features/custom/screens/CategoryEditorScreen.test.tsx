import { StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { mockCustomAudio } from '@/test-utils/mocks/audio';
import { dialogButtons, openDialog, pressInDialog } from '@/test-utils/dialog';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { left, mockRouter, setRouteParams, tryToLeave } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

import { CategoryEditorScreen } from './CategoryEditorScreen';

async function withCategory(title = 'أدعيتي') {
  const repos = await createTestRepositories();
  const category = await repos.custom.createCategory(title);
  return { repos, category };
}

describe('New category', () => {
  it('creates a category and opens its editor', async () => {
    const { repos } = await renderWithApp(<CategoryEditorScreen />);
    await fireEvent.changeText(screen.getByLabelText(tr('custom.categoryName')), 'أذكار العمل');
    await fireEvent.press(screen.getByText(tr('custom.create')));
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/custom/[id]',
        params: { id: '-1' },
      }),
    );
    expect((await repos.custom.listCategories()).map((c) => c.title)).toEqual(['أذكار العمل']);
  });

  it('asks for a name', async () => {
    await renderWithApp(<CategoryEditorScreen />);
    await fireEvent.press(screen.getByText(tr('custom.create')));
    expect(await screen.findByText(tr('custom.errors.emptyTitle'))).toBeOnTheScreen();
  });
});

describe('Edit category', () => {
  it('lists the adhkar and opens the dhikr editor', async () => {
    const { repos, category } = await withCategory();
    const d = await repos.custom.createDhikr(category.id, { text: 'الحمد لله', count: 33 });
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    expect(await screen.findByText('الحمد لله')).toBeOnTheScreen();
    expect(screen.getByText('× 33')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('الحمد لله'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(category.id), dhikrId: String(d.id) },
    });
    await fireEvent.press(screen.getByText(tr('custom.addDhikr')));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/custom/[id]/dhikr/[dhikrId]',
      params: { id: String(category.id), dhikrId: 'new' },
    });
  });

  it('an unlimited dhikr shows «× ∞» instead of its number (owner, 2026-11-27)', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'أ', count: 33, unlimited: true });
    await repos.custom.createDhikr(category.id, { text: 'ب', count: 3 });
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    expect(await screen.findByText(tr('custom.times', { n: '∞' }))).toBeOnTheScreen();
    expect(screen.getByText(tr('custom.times', { n: 3 }))).toBeOnTheScreen();
    expect(screen.queryByText(tr('custom.times', { n: 33 }))).toBeNull();
  });

  it('renames the category', async () => {
    const { repos, category } = await withCategory('قديم');
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.changeText(await screen.findByDisplayValue('قديم'), 'جديد');
    await fireEvent.press(screen.getByText(tr('custom.save')));
    await waitFor(async () =>
      expect((await repos.custom.getCategory(category.id))?.title).toBe('جديد'),
    );
  });

  it('deletes the category with its audio and its favorite, after confirming', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'نص', count: 1, audioFile: 'a.m4a' });
    await repos.favorites.add(category.id);
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.press(await screen.findByText(tr('custom.deleteCategory')));
    // The name with no «», in its own color (owner, 2026-11-26); the red button on top.
    expect(openDialog().getByText(/^حذف أدعيتي؟$/)).toBeOnTheScreen();
    expect(openDialog().queryByText(/«/)).toBeNull();
    const name = openDialog().getByText('أدعيتي');
    expect(StyleSheet.flatten(name.props.style).color).not.toBe(
      StyleSheet.flatten(openDialog().getByText(/^حذف أدعيتي؟$/).props.style).color,
    );
    expect(dialogButtons()).toEqual([tr('custom.delete'), tr('common.cancel')]);
    await pressInDialog(tr('custom.delete'));
    await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/adhkar'));
    expect(await repos.custom.listCategories()).toEqual([]);
    expect(await repos.favorites.list()).toEqual([]);
    expect(mockCustomAudio.deleteCustomAudio).toHaveBeenCalledWith('a.m4a');
  });

  it('cancelling the delete keeps the category', async () => {
    const { repos, category } = await withCategory();
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.press(await screen.findByText(tr('custom.deleteCategory')));
    await pressInDialog(tr('common.cancel'));
    expect(screen.queryByTestId('dialog')).toBeNull();
    expect(await repos.custom.listCategories()).toHaveLength(1);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });
});

describe('Category editor: leaving with changes', () => {
  it('a new chapter with a name typed: asks first; «تجاهل» creates nothing', async () => {
    const { repos } = await renderWithApp(<CategoryEditorScreen />);
    await fireEvent.changeText(screen.getByLabelText(tr('custom.categoryName')), 'x');
    expect(await tryToLeave()).toBe(false);
    await pressInDialog(tr('custom.discard'));
    expect(left).toEqual([{ type: 'GO_BACK' }]);
    expect(await repos.custom.listCategories()).toEqual([]);
  });

  it('a new chapter with no name: leaves at once', async () => {
    await renderWithApp(<CategoryEditorScreen />);
    expect(await tryToLeave()).toBe(true);
  });

  it('a renamed chapter not saved: asks first; «متابعة التعديل» stays', async () => {
    const { repos, category } = await withCategory('old');
    setRouteParams({ id: String(category.id) });
    await renderWithApp(<CategoryEditorScreen />, repos);
    await fireEvent.changeText(await screen.findByDisplayValue('old'), 'new');
    expect(await tryToLeave()).toBe(false);
    await pressInDialog(tr('custom.keepEditing'));
    expect(left).toEqual([]);
    expect(screen.getByDisplayValue('new')).toBeOnTheScreen();
  });

  it('an unknown chapter: says it is not found', async () => {
    setRouteParams({ id: '-999' });
    await renderWithApp(<CategoryEditorScreen />);
    expect(await screen.findByText(tr('custom.errors.notFound'))).toBeOnTheScreen();
  });
});
