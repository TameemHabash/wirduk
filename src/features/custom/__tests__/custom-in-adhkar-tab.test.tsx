/** The user's own adhkar in the «الأذكار» tab: the «أذكاري» section and the search. */
import { fireEvent, screen } from '@testing-library/react-native';

import { AdhkarScreen } from '@/features/adhkar/screens/AdhkarScreen';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';
import { tr } from '@/test-utils/tr';

async function withCategory(title = 'أدعيتي') {
  const repos = await createTestRepositories();
  const category = await repos.custom.createCategory(title);
  return { repos, category };
}

describe('The adhkar tab — أذكاري section', () => {
  it('invites the user to add their own adhkar when there are none', async () => {
    await renderWithApp(<AdhkarScreen />);
    expect(await screen.findByText(tr('custom.emptyTitle'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: tr('custom.addCategory') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/custom/new');
  });

  it('lists own categories first, opens them, and links to manage', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'سبحان الله', count: 33 });
    await renderWithApp(<AdhkarScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('أدعيتي، ذكر واحد'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: String(category.id) },
    });
    await fireEvent.press(screen.getByText(tr('custom.manage')));
    expect(mockRouter.push).toHaveBeenCalledWith('/custom');
  });

  it('lets an own category be a favorite', async () => {
    const { repos, category } = await withCategory();
    await renderWithApp(<AdhkarScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('إضافة «أدعيتي» إلى المفضلة'));
    expect(await screen.findByLabelText('إزالة «أدعيتي» من المفضلة')).toBeOnTheScreen();
    expect(await repos.favorites.list()).toEqual([category.id]);
    await settleLists();
  });
  it('finds own adhkar in search, first and labelled', async () => {
    const { repos, category } = await withCategory();
    await repos.custom.createDhikr(category.id, { text: 'رَضِيتُ بِاللَّهِ رَبًّا', count: 1 });
    await renderWithApp(<AdhkarScreen />, repos);
    await fireEvent.changeText(screen.getByPlaceholderText(tr('search.placeholder')), 'رضيت بالله');
    expect((await screen.findAllByText(/^أذكاري · أدعيتي · الذكر 1$/)).length).toBe(1);
  });
});
