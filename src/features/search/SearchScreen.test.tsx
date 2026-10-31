import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithApp } from '@/test-utils/render-app';
import { mockRouter } from '@/test-utils/router-mock';

import { SearchScreen } from './SearchScreen';

const input = () => screen.getByPlaceholderText('ابحث بكلمة من الذكر أو اسم الباب');

describe('SearchScreen', () => {
  it('starts with a hint', async () => {
    await renderWithApp(<SearchScreen />);
    expect(screen.getByText('اكتب كلمة للبحث. لا يهم التشكيل ولا الهمزات.')).toBeOnTheScreen();
  });

  it('finds categories by title and opens them', async () => {
    await renderWithApp(<SearchScreen />);
    await fireEvent.changeText(input(), 'النوم');
    expect(await screen.findByText('الأبواب')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('أذكار النوم'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/category/[id]',
      params: { id: '2' },
    });
  });

  it('finds adhkar without tashkeel and opens the reader at that dhikr', async () => {
    await renderWithApp(<SearchScreen />);
    await fireEvent.changeText(input(), 'رضيت بالله ربا');
    expect(await screen.findByText('الأذكار')).toBeOnTheScreen();
    // 14th: the owner's own opening dhikr comes first in morning and evening.
    await fireEvent.press(screen.getAllByText(/الذكر 14$/)[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/category/[id]',
        params: expect.objectContaining({ dhikr: expect.stringMatching(/^(1|133)013$/) }),
      }),
    );
  });

  it('says when nothing matches', async () => {
    await renderWithApp(<SearchScreen />);
    await fireEvent.changeText(input(), 'كلمةغيرموجودة');
    expect(await screen.findByText('لا توجد نتائج لـ «كلمةغيرموجودة».')).toBeOnTheScreen();
  });

  it('clears the query', async () => {
    await renderWithApp(<SearchScreen />);
    await fireEvent.changeText(input(), 'النوم');
    await fireEvent.press(screen.getByLabelText('مسح البحث'));
    expect(input().props.value).toBe('');
  });
});
