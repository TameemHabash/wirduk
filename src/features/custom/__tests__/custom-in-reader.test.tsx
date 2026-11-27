/** Reading the user's own adhkar in the reader. */
import { fireEvent, screen } from '@testing-library/react-native';

import { ReaderScreen } from '@/features/reader/screens/ReaderScreen';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';
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
