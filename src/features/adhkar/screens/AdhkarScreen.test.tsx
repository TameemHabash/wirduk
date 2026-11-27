import { StyleSheet } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { COLORS } from '@/theme/colors';
import { createTestRepositories, renderWithApp, settleLists } from '@/test-utils/render-app';
import { mockRouter, setRouteParams } from '@/test-utils/router-mock';

import { AdhkarScreen } from './AdhkarScreen';

const input = () => screen.getByPlaceholderText('ابحث بكلمة من الذكر أو اسم الباب');

/** The chapter rows' titles, in order (rows are labelled "title، count"). */
function chapterTitles(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string | undefined)
    .filter((l): l is string => !!l && l.includes('، '))
    .map((l) => l.split('، ')[0]!);
}

describe('the «الأذكار» tab', () => {
  it('has a large title and the search box on top', async () => {
    await renderWithApp(<AdhkarScreen />);
    expect(screen.getByRole('header', { name: 'الأذكار' })).toBeOnTheScreen();
    expect(input()).toBeOnTheScreen();
  });

  it('«أذكاري» comes first, then every chapter of the book except morning and evening', async () => {
    const repos = await createTestRepositories();
    await repos.custom.createCategory('أدعيتي');
    await renderWithApp(<AdhkarScreen />, repos);
    await screen.findByText('كل الأذكار');
    const titles = chapterTitles();
    expect(titles[0]).toBe('أدعيتي');
    expect(titles[1]).toBe('أذكار النوم');
    expect(titles).not.toContain('أذكار الصباح');
    expect(titles).not.toContain('أذكار المساء');
  });

  it('opens a chapter', async () => {
    await renderWithApp(<AdhkarScreen />);
    await fireEvent.press(await screen.findByLabelText('أذكار النوم، 13 ذكرًا'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '2' },
    });
  });

  it('adds a favorite and saves it', async () => {
    const { repos } = await renderWithApp(<AdhkarScreen />);
    await fireEvent.press(await screen.findByLabelText('إضافة «أذكار النوم» إلى المفضلة'));
    expect(await screen.findByLabelText('إزالة «أذكار النوم» من المفضلة')).toBeOnTheScreen();
    expect(await repos.favorites.list()).toEqual([2]);
    await settleLists();
  });

  it('«تعديل الترتيب» opens the reorder screen', async () => {
    await renderWithApp(<AdhkarScreen />);
    await fireEvent.press(await screen.findByText('تعديل الترتيب'));
    expect(mockRouter.push).toHaveBeenCalledWith('/reorder');
  });

  it('shows a saved custom order', async () => {
    const repos = await createTestRepositories();
    await repos.categoryOrder.save([5, 4, 3, 2]);
    await renderWithApp(<AdhkarScreen />, repos);
    await screen.findByText('كل الأذكار');
    expect(chapterTitles().slice(0, 4)).toEqual([
      'دعاء الخروج من الخلاء',
      'دعاء دخول الخلاء',
      'أذكار الاستيقاظ من النوم',
      'أذكار النوم',
    ]);
  });
});

describe('search inside the tab', () => {
  it('a hint while the box is empty and focused, instead of the lists', async () => {
    await renderWithApp(<AdhkarScreen />);
    await screen.findByText('كل الأذكار');
    await fireEvent(input(), 'focus');
    expect(screen.getByText('اكتب كلمة للبحث. لا يهم التشكيل ولا الهمزات.')).toBeOnTheScreen();
    expect(screen.queryByText('كل الأذكار')).toBeNull();
    await fireEvent(input(), 'blur');
    expect(screen.getByText('كل الأذكار')).toBeOnTheScreen();
  });

  it('finds chapters by title: results in place of the lists; opens them', async () => {
    await renderWithApp(<AdhkarScreen />);
    await fireEvent.changeText(input(), 'النوم');
    expect(await screen.findByText('الأبواب')).toBeOnTheScreen();
    expect(screen.queryByText('كل الأذكار')).toBeNull();
    await fireEvent.press(screen.getAllByLabelText('أذكار النوم، 13 ذكرًا')[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '2' },
    });
  });

  it('finds adhkar without tashkeel and opens the reader at that dhikr', async () => {
    await renderWithApp(<AdhkarScreen />);
    await fireEvent.changeText(input(), 'رضيت بالله ربا');
    expect(await screen.findAllByText(/الذكر 14$/)).not.toHaveLength(0);
    // 14th: the owner's own opening dhikr comes first in morning and evening.
    await fireEvent.press(screen.getAllByText(/الذكر 14$/)[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/category/[id]',
        params: expect.objectContaining({ dhikr: expect.stringMatching(/^(1|133)013$/) }),
      }),
    );
  });

  it('says when nothing matches: the word without «», in teal (owner, 2026-11-26)', async () => {
    await renderWithApp(<AdhkarScreen />, undefined, { theme: 'light' });
    await fireEvent.changeText(input(), 'كلمةغيرموجودة');
    expect(await screen.findByText('لا توجد نتائج لـ كلمةغيرموجودة.')).toBeOnTheScreen();
    expect(screen.queryByText(/«/)).toBeNull();
    const word = screen.getByText('كلمةغيرموجودة');
    expect(StyleSheet.flatten(word.props.style).color).toBe(COLORS.light.primaryInk);
  });

  it('clears the query and brings the lists back', async () => {
    await renderWithApp(<AdhkarScreen />);
    await fireEvent.changeText(input(), 'النوم');
    await fireEvent.press(screen.getByLabelText('مسح البحث'));
    expect(input().props.value).toBe('');
    expect(await screen.findByText('كل الأذكار')).toBeOnTheScreen();
  });

  it('opened with ?focus=search (Home, wirduk://search): the keyboard comes up', async () => {
    jest.useFakeTimers();
    setRouteParams({ focus: 'search' });
    await renderWithApp(<AdhkarScreen />);
    expect(mockRouter.setParams).toHaveBeenCalledWith({ focus: '' });
    jest.useRealTimers();
  });
});
