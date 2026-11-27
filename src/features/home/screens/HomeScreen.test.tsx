import { fireEvent, screen } from '@testing-library/react-native';

import { mockRouter } from '@/test-utils/mocks/router';
import { createTestRepositories, renderWithApp } from '@/test-utils/render-app';

import { HomeScreen } from './HomeScreen';
import { tr } from '@/test-utils/tr';

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

describe('HomeScreen («الرئيسية»)', () => {
  it('shows the logo without the name beside it; screen readers hear the name as the heading', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByRole('header', { name: tr('home.title') })).toBeOnTheScreen();
    expect(screen.queryByText(tr('home.title'))).toBeNull();
  });

  it('in the morning: the golden morning card «الآن» with «ابدأ», the evening as a small row', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByLabelText(/^أذكار الصباح، 24 ذكرًا، الآن$/)).toBeOnTheScreen();
    expect(screen.getByText(tr('home.start'))).toBeOnTheScreen();
    expect(screen.getByLabelText(/^أذكار المساء، 22 ذكرًا$/)).toBeOnTheScreen();
  });

  it('in the evening: the evening card comes first, «الآن»', async () => {
    setClock(20);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByLabelText(/^أذكار المساء، 22 ذكرًا، الآن$/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/^أذكار الصباح، 24 ذكرًا$/)).toBeOnTheScreen();
  });

  it('opens the card’s chapter', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    await fireEvent.press(await screen.findByLabelText(/^أذكار الصباح، 24 ذكرًا، الآن$/));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '1' },
    });
  });

  it('has no chapter list: the chapters are in the «الأذكار» tab', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    await screen.findByText(tr('home.favorites'));
    expect(screen.queryByText(tr('home.allAdhkar'))).toBeNull();
    expect(screen.queryByLabelText('أذكار النوم، 13 ذكرًا')).toBeNull();
  });

  it('no favorites yet: a hint on how to add one', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    expect(await screen.findByText(tr('home.favoritesEmpty'))).toBeOnTheScreen();
  });

  it('shows the favorites as tiles that open their chapter', async () => {
    setClock(8);
    const repos = await createTestRepositories();
    await repos.favorites.add(2);
    await repos.favorites.add(3);
    await renderWithApp(<HomeScreen />, repos);
    await fireEvent.press(await screen.findByLabelText('أذكار النوم، 13 ذكرًا'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '2' },
    });
    expect(screen.queryByText(/^اضغط النجمة/)).toBeNull();
  });

  it('«أدومها» off: its gold badge opens the setup', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: tr('adwamuha.setup.title') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/adwamuha/intro');
  });

  it('the search button opens the adhkar tab with the keyboard up', async () => {
    setClock(8);
    await renderWithApp(<HomeScreen />);
    await fireEvent.press(await screen.findByLabelText(tr('home.searchPlaceholder')));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/adhkar',
      params: { focus: 'search' },
    });
  });
});
