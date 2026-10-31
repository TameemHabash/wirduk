import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { mockRouter } from '@/test-utils/router-mock';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';

import { HomeScreen } from './HomeScreen';

/** Fakes only the clock (Date), so promises and timers behave normally. */
function setClock(hour: number) {
  jest.useFakeTimers({
    now: new Date(2026, 9, 16, hour, 0),
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'performance',
      'hrtime',
    ],
  });
}

afterEach(() => {
  jest.useRealTimers();
});

describe('HomeScreen', () => {
  it('shows the logo without the name beside it; screen readers hear the name as the heading', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByRole('header', { name: 'وِرْدُك' })).toBeOnTheScreen();
    expect(screen.queryByText('وِرْدُك')).toBeNull();
  });

  it('puts morning first, marked "now", in the morning', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    const now = await screen.findByLabelText(/^أذكار الصباح، 24 ذكرًا، الآن$/);
    expect(now).toBeOnTheScreen();
    expect(screen.getByLabelText(/^أذكار المساء، 22 ذكرًا$/)).toBeOnTheScreen();
  });

  it('puts evening first, marked "now", in the evening', async () => {
    setClock(20);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByLabelText(/^أذكار المساء، 22 ذكرًا، الآن$/)).toBeOnTheScreen();
  });

  it('lists the other categories with chapter numbers, without morning and evening', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByLabelText('أذكار النوم، 13 ذكرًا')).toBeOnTheScreen();
    // Morning/evening appear once each (the cards), not again in the list.
    expect(screen.getAllByText('أذكار الصباح')).toHaveLength(1);
  });

  it('opens a category', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    await fireEvent.press(await screen.findByLabelText('أذكار النوم، 13 ذكرًا'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '2' },
    });
  });

  it('adds a favorite, shows it as a chip, and saves it', async () => {
    setClock(8);
    const { repos } = await renderWithApp(<HomeScreen />);
    expect(screen.queryByText('المفضلة')).toBeNull();
    await fireEvent.press(await screen.findByLabelText('إضافة «أذكار النوم» إلى المفضلة'));
    expect(await screen.findByText('المفضلة')).toBeOnTheScreen();
    expect(await screen.findByLabelText('إزالة «أذكار النوم» من المفضلة')).toBeOnTheScreen();
    expect(await repos.favorites.list()).toEqual([2]);
    await settleLists();
  });

  it('switches to reorder mode and back', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    await fireEvent.press(await screen.findByText('تعديل الترتيب'));
    expect(screen.getByText('تم')).toBeOnTheScreen();
    expect(screen.getByText('استعادة الترتيب الافتراضي')).toBeOnTheScreen();
    expect(screen.getByLabelText('اسحب لتغيير ترتيب «أذكار النوم»')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('تم'));
    await waitFor(() => expect(screen.getByText('كل الأذكار')).toBeOnTheScreen());
  });

  it('shows a saved custom order', async () => {
    setClock(8);
    const repos = await createTestRepositories();
    await repos.categoryOrder.save([5, 4, 3, 2]);
    await renderWithApp(<HomeScreen />, repos);
    await screen.findByText('كل الأذكار');
    // Category rows are labelled "title، count"; the two time-of-day cards come first.
    const titles = screen
      .getAllByRole('button')
      .map((b) => b.props.accessibilityLabel as string | undefined)
      .filter((l): l is string => !!l && l.includes('، '))
      .map((l) => l.split('، ')[0]!)
      .filter((t) => t !== 'أذكار الصباح' && t !== 'أذكار المساء');
    expect(titles.slice(0, 4)).toEqual([
      'دعاء الخروج من الخلاء',
      'دعاء دخول الخلاء',
      'أذكار الاستيقاظ من النوم',
      'أذكار النوم',
    ]);
  });
});
