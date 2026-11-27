import { fireEvent, screen } from '@testing-library/react-native';

import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/mocks/router';

import { MyAdhkarScreen } from './MyAdhkarScreen';
import { tr } from '@/test-utils/tr';

async function withCategory(title = 'أدعيتي') {
  const repos = await createTestRepositories();
  const category = await repos.custom.createCategory(title);
  return { repos, category };
}

describe('My adhkar screen', () => {
  it('lists own categories and opens their editor', async () => {
    const { repos, category } = await withCategory();
    await renderWithApp(<MyAdhkarScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('أدعيتي، لا أذكار'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/custom/[id]',
      params: { id: String(category.id) },
    });
    await fireEvent.press(screen.getByText(tr('custom.addCategory')));
    expect(mockRouter.push).toHaveBeenCalledWith('/custom/new');
  });
});
